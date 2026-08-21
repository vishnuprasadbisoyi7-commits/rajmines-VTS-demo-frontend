package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"rajmines-vts/internal/ais140"
	"rajmines-vts/internal/api"
	"rajmines-vts/internal/db"
	"rajmines-vts/internal/kafka"
	"rajmines-vts/internal/ws"
)

func main() {
	log.Println("===================================================================")
	log.Println("  RAJMINES VTS - AIS-140 FLEET SURVEILLANCE & RAJDHARAA GIS SYSTEM")
	log.Println("  Department of Mines & Geology (DMG), Govt. of Rajasthan")
	log.Println("===================================================================")

	// Environment variables or defaults
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	pgConnStr := os.Getenv("DATABASE_URL")
	kafkaBrokers := []string{os.Getenv("KAFKA_BROKERS")}
	if kafkaBrokers[0] == "" {
		kafkaBrokers = []string{"localhost:9092"}
	}

	// 1. Initialize DB Repository
	repo := db.NewRepository(pgConnStr)

	// 2. Initialize Kafka Broker
	broker := kafka.NewBroker(kafkaBrokers)
	defer broker.Close()

	// 3. Initialize WebSocket Hub
	hub := ws.NewHub()
	go hub.Run()

	// 4. Initialize API Handler
	handler := api.NewHandler(repo, broker, hub)

	// 5. Initialize Simulator
	geofences := repo.GetAllGeofences()
	sim := ais140.NewSimulator(geofences)

	// Ingestion Pipeline:
	// Simulator -> Publish to Kafka (Raw & Processed) -> Subscribe -> Update Repository -> Broadcast over WebSocket
	sim.Start(func(packet *ais140.AIS140Packet, update *ais140.TelemetryUpdate) {
		// Log raw packet in repository
		repo.AddRawPacket(packet.RawPacket)

		// Publish to Kafka
		_ = broker.PublishRawAIS140(packet.RawPacket)
		_ = broker.PublishTelemetryUpdate(update)

		// Update database / memory repository
		repo.UpdateVehicleTelemetry(update)

		// Broadcast live update to all connected React clients
		hub.BroadcastJSON("TELEMETRY_UPDATE", update)
		hub.BroadcastJSON("RAW_PACKET", packet.RawPacket)
	})

	// Background consumer for Kafka alerts stream (if external alert pushed)
	alertsChan := broker.Subscribe(kafka.TopicAlerts)
	go func() {
		for msg := range alertsChan {
			var alert db.AlertRecord
			if err := json.Unmarshal(msg, &alert); err == nil {
				repo.AddAlert(&alert)
				hub.BroadcastJSON("ALERT", alert)
			}
		}
	}()

	// 6. Register HTTP Routes
	mux := http.NewServeMux()

	// WebSocket Endpoint
	mux.HandleFunc("/ws", hub.ServeWS)

	// REST API Endpoints
	mux.HandleFunc("/api/v1/vehicles", handler.HandleVehicles)
	mux.HandleFunc("/api/v1/vehicles/", func(w http.ResponseWriter, r *http.Request) {
		if len(r.URL.Path) > len("/api/v1/vehicles/") {
			if r.URL.Path[len(r.URL.Path)-len("/trail"):] == "/trail" {
				handler.HandleVehicleTrail(w, r)
			} else {
				handler.HandleVehicleDetail(w, r)
			}
		} else {
			handler.HandleVehicles(w, r)
		}
	})
	mux.HandleFunc("/api/v1/geofences", handler.HandleGeofences)
	mux.HandleFunc("/api/v1/eravanna", handler.HandleERavanna)
	mux.HandleFunc("/api/v1/alerts", handler.HandleAlerts)
	mux.HandleFunc("/api/v1/alerts/", handler.HandleResolveAlert)
	mux.HandleFunc("/api/v1/stats", handler.HandleStats)
	mux.HandleFunc("/api/v1/packets/raw", handler.HandleRawPackets)
	mux.HandleFunc("/api/v1/simulator/trigger", handler.HandleSimulatorTrigger)

	// Rajdharaa GIS Layer Metadata & Checkposts Proxy
	mux.HandleFunc("/api/v1/gis/layers", handler.HandleGISLayers)

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"OK","system":"RajMines VTS Backend","time":"%s"}`, time.Now().UTC().Format(time.RFC3339))
	})

	// Wrap with CORS middleware
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      api.CORSMiddleware(mux),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown handling
	go func() {
		log.Printf("[SERVER] RajMines VTS HTTP & WebSocket server listening on http://localhost:%s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[SERVER FATAL] Server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[SERVER] Shutting down RajMines VTS server gracefully...")

	sim.Stop()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("[SERVER FATAL] Server forced shutdown: %v", err)
	}
	log.Println("[SERVER] Server exited cleanly.")
}
