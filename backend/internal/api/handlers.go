package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"rajmines-vts/internal/db"
	"rajmines-vts/internal/kafka"
	"rajmines-vts/internal/ws"
)

// SimulatorTriggerRequest defines payload to simulate events on the fly
type SimulatorTriggerRequest struct {
	VehicleRegNo string `json:"vehicle_reg_no"`
	EventType    string `json:"event_type"` // SOS, OVERSPEED, GEOFENCE_BREACH, TAMPER, IGNITION_TOGGLE
}

// Handler aggregates API endpoints
type Handler struct {
	repo   *db.Repository
	broker *kafka.Broker
	hub    *ws.Hub
}

// NewHandler constructs API handler
func NewHandler(repo *db.Repository, broker *kafka.Broker, hub *ws.Hub) *Handler {
	return &Handler{
		repo:   repo,
		broker: broker,
		hub:    hub,
	}
}

// CORSMiddleware enables cross-origin requests
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// HandleVehicles returns list of all tracked vehicles
func (h *Handler) HandleVehicles(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vehicles := h.repo.GetAllVehicles()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"count":   len(vehicles),
		"data":    vehicles,
	})
}

// HandleVehicleDetail returns single vehicle info
func (h *Handler) HandleVehicleDetail(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		http.Error(w, `{"error":"vehicle reg_no missing"}`, http.StatusBadRequest)
		return
	}
	regNo := pathParts[3]

	v, ok := h.repo.GetVehicleByRegNo(regNo)
	if !ok {
		http.Error(w, `{"error":"vehicle not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    v,
	})
}

// HandleVehicleTrail returns telemetry breadcrumbs for playback
func (h *Handler) HandleVehicleTrail(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 5 {
		http.Error(w, `{"error":"invalid trail URL"}`, http.StatusBadRequest)
		return
	}
	regNo := pathParts[3]

	trail := h.repo.GetTelemetryTrail(regNo)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":        true,
		"vehicle_reg_no": regNo,
		"points_count":   len(trail),
		"trail":          trail,
	})
}

// HandleGeofences returns Rajasthan mining lease zones
func (h *Handler) HandleGeofences(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	zones := h.repo.GetAllGeofences()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"count":   len(zones),
		"data":    zones,
	})
}

// HandleERavanna returns active mining transit passes
func (h *Handler) HandleERavanna(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	passes := h.repo.GetAllERavanna()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"count":   len(passes),
		"data":    passes,
	})
}

// HandleAlerts returns fleet alerts
func (h *Handler) HandleAlerts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	alerts := h.repo.GetAllAlerts()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"count":   len(alerts),
		"data":    alerts,
	})
}

// HandleResolveAlert marks alert as acknowledged
func (h *Handler) HandleResolveAlert(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 5 {
		http.Error(w, `{"error":"alert ID missing"}`, http.StatusBadRequest)
		return
	}
	alertID := pathParts[3]

	resolved := h.repo.ResolveAlert(alertID)
	if !resolved {
		http.Error(w, `{"error":"alert not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"message":  "Alert marked as resolved",
		"alert_id": alertID,
	})
}

// HandleStats returns fleet dashboard KPI counts
func (h *Handler) HandleStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	stats := h.repo.GetFleetStats()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    stats,
	})
}

// HandleRawPackets returns raw AIS-140 packet stream history
func (h *Handler) HandleRawPackets(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	packets := h.repo.GetRawPackets()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"count":   len(packets),
		"packets": packets,
	})
}

// HandleSimulatorTrigger triggers manual alert/event in simulator
func (h *Handler) HandleSimulatorTrigger(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req SimulatorTriggerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
		return
	}

	v, exists := h.repo.GetVehicleByRegNo(req.VehicleRegNo)
	if !exists {
		http.Error(w, `{"error":"vehicle not found"}`, http.StatusNotFound)
		return
	}

	// Create and log alert
	alert := &db.AlertRecord{
		VehicleID: v.ID,
		RegNo:     v.RegNo,
		IMEI:      v.IMEI,
		Latitude:  v.LastLatitude,
		Longitude: v.LastLongitude,
		Speed:     v.LastSpeed,
		Timestamp: time.Now(),
	}

	switch req.EventType {
	case "SOS":
		alert.AlertType = "SOS_EMERGENCY"
		alert.Severity = "CRITICAL"
		alert.Message = "PANIC BUTTON PRESSED: Emergency assistance triggered by driver (" + v.DriverName + ")"
		v.Status = "SOS"
		v.LastEmergency = true
	case "OVERSPEED":
		alert.AlertType = "OVERSPEED"
		alert.Severity = "HIGH"
		alert.Message = "Speed violation: 78.4 km/h in restricted mining corridor (Max: 40 km/h)"
		v.Status = "OVERSPEED"
		v.LastSpeed = 78.4
	case "GEOFENCE_BREACH":
		alert.AlertType = "GEOFENCE_BREACH"
		alert.Severity = "HIGH"
		alert.Message = "Unauthorized exit from Makrana Mining Lease Zone Boundary without valid e-Ravanna clearance"
		v.Status = "MOVING"
	case "TAMPER":
		alert.AlertType = "BATTERY_TAMPER"
		alert.Severity = "CRITICAL"
		alert.Message = "AIS-140 GPS Device Main Power Disconnected / Wire Cut Detected"
		v.LastInternalBatt = 3.65
	case "IGNITION_TOGGLE":
		v.LastIgnition = !v.LastIgnition
		if v.LastIgnition {
			v.Status = "MOVING"
			alert.AlertType = "IGNITION_ON"
			alert.Severity = "LOW"
			alert.Message = "Vehicle ignition turned ON"
		} else {
			v.Status = "STOPPED"
			alert.AlertType = "IGNITION_OFF"
			alert.Severity = "LOW"
			alert.Message = "Vehicle ignition turned OFF"
		}
	default:
		http.Error(w, `{"error":"unsupported event_type"}`, http.StatusBadRequest)
		return
	}

	h.repo.AddAlert(alert)
	// Broadcast alert over WebSocket and Kafka
	h.hub.BroadcastJSON("ALERT", alert)
	h.hub.BroadcastJSON("VEHICLE_UPDATE", v)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Simulated event triggered successfully",
		"event":   req.EventType,
		"alert":   alert,
	})
}
