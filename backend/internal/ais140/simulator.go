package ais140

import (
	"log"
	"math"
	"math/rand"
	"time"

	"rajmines-vts/internal/geofence"
)

// SimulatedVehicleState maintains moving vehicle simulation data
type SimulatedVehicleState struct {
	VehicleID      string
	RegNo          string
	IMEI           string
	Waypoints      []geofence.Point
	CurrentIndex   int
	Progress       float64 // 0.0 to 1.0 between current and next waypoint
	SpeedKmh       float64
	Heading        float64
	Ignition       bool
	EmergencySOS   bool
	MainPower      bool
	BattVolts      float64
	MineralType    string
	ActiveGeofence string
	ERavannaPassNo string
}

// Simulator manages telemetry generation for Rajasthan mining fleet
type Simulator struct {
	vehicles []*SimulatedVehicleState
	geofences []geofence.GeofenceZone
	stopChan  chan struct{}
}

// NewSimulator creates and initializes route waypoints
func NewSimulator(geofences []geofence.GeofenceZone) *Simulator {
	sim := &Simulator{
		geofences: geofences,
		stopChan:  make(chan struct{}),
	}

	// 1. Makrana to Kishangarh Marble Corridor
	v1Waypoints := []geofence.Point{
		{Lat: 27.0425, Lng: 74.7214}, // Makrana Pit
		{Lat: 27.0150, Lng: 74.7350},
		{Lat: 26.9600, Lng: 74.7600},
		{Lat: 26.8900, Lng: 74.7900},
		{Lat: 26.8120, Lng: 75.5420}, // Bagru Checkpost
		{Lat: 26.7200, Lng: 74.8300},
		{Lat: 26.5780, Lng: 74.8620}, // Kishangarh Stockyard
		{Lat: 26.6500, Lng: 74.8500},
		{Lat: 26.8500, Lng: 74.7800},
		{Lat: 27.0425, Lng: 74.7214}, // Return
	}

	// 2. Bhilwara to Udaipur Soapstone Corridor
	v2Waypoints := []geofence.Point{
		{Lat: 25.3480, Lng: 74.6380}, // Bhilwara Mine
		{Lat: 25.2100, Lng: 74.6100},
		{Lat: 25.0500, Lng: 74.5700},
		{Lat: 24.8900, Lng: 74.4500},
		{Lat: 24.7200, Lng: 74.1500},
		{Lat: 24.5854, Lng: 73.7125}, // Udaipur Plant
		{Lat: 24.7800, Lng: 74.2200},
		{Lat: 25.1200, Lng: 74.5800},
		{Lat: 25.3480, Lng: 74.6380}, // Return
	}

	// 3. Jodhpur Sandstone Basin Loop
	v3Waypoints := []geofence.Point{
		{Lat: 26.2980, Lng: 73.0180}, // Jodhpur Quarry
		{Lat: 26.3420, Lng: 73.0480}, // Mandore Checkpost
		{Lat: 26.3900, Lng: 73.1100},
		{Lat: 26.4300, Lng: 73.1800},
		{Lat: 26.3800, Lng: 73.1500},
		{Lat: 26.2980, Lng: 73.0180}, // Return
	}

	// 4. Jaisalmer to Pokhran Limestone Route
	v4Waypoints := []geofence.Point{
		{Lat: 26.9150, Lng: 70.9080}, // Jaisalmer Mine
		{Lat: 26.9180, Lng: 71.2100},
		{Lat: 26.9200, Lng: 71.5500},
		{Lat: 26.9210, Lng: 71.9180}, // Pokhran Post
		{Lat: 26.9190, Lng: 71.4000},
		{Lat: 26.9150, Lng: 70.9080}, // Return
	}

	sim.vehicles = []*SimulatedVehicleState{
		{
			VehicleID: "VEH-RAJ-01", RegNo: "RJ14-GB-9821", IMEI: "864920047382910",
			Waypoints: v1Waypoints, CurrentIndex: 0, Progress: 0.1, SpeedKmh: 46.5,
			Ignition: true, MainPower: true, BattVolts: 4.15, MineralType: "White Marble",
			ActiveGeofence: "Makrana Marble Mining Cluster", ERavannaPassNo: "ERAV-2026-MKR-0081",
		},
		{
			VehicleID: "VEH-RAJ-02", RegNo: "RJ27-GA-4512", IMEI: "864920047382921",
			Waypoints: v2Waypoints, CurrentIndex: 1, Progress: 0.4, SpeedKmh: 42.0,
			Ignition: true, MainPower: true, BattVolts: 4.10, MineralType: "Soapstone & Feldspar",
			ActiveGeofence: "Bhilwara Soapstone Area", ERavannaPassNo: "ERAV-2026-BHL-0144",
		},
		{
			VehicleID: "VEH-RAJ-03", RegNo: "RJ19-UB-7734", IMEI: "864920047382932",
			Waypoints: v3Waypoints, CurrentIndex: 2, Progress: 0.7, SpeedKmh: 54.0,
			Ignition: true, MainPower: true, BattVolts: 4.20, MineralType: "Sandstone",
			ActiveGeofence: "Jodhpur Sandstone Basin", ERavannaPassNo: "ERAV-2026-JDH-0391",
		},
		{
			VehicleID: "VEH-RAJ-04", RegNo: "RJ15-TA-2190", IMEI: "864920047382943",
			Waypoints: v4Waypoints, CurrentIndex: 0, Progress: 0.8, SpeedKmh: 50.0,
			Ignition: true, MainPower: true, BattVolts: 3.98, MineralType: "Yellow Limestone",
			ActiveGeofence: "Jaisalmer Limestone Block", ERavannaPassNo: "ERAV-2026-JSL-0092",
		},
	}

	return sim
}

// Start begins emitting AIS-140 telemetry updates every interval
func (s *Simulator) Start(onPacketGenerated func(packet *AIS140Packet, update *TelemetryUpdate)) {
	ticker := time.NewTicker(2500 * time.Millisecond) // Emit telemetry every 2.5 seconds
	go func() {
		for {
			select {
			case <-s.stopChan:
				ticker.Stop()
				return
			case <-ticker.C:
				s.stepSimulation(onPacketGenerated)
			}
		}
	}()
	log.Println("[SIMULATOR] AIS-140 GPS Telemetry Simulator started for Rajasthan Mining Corridors.")
}

// Stop halts simulation
func (s *Simulator) Stop() {
	close(s.stopChan)
}

func (s *Simulator) stepSimulation(onPacketGenerated func(packet *AIS140Packet, update *TelemetryUpdate)) {
	for _, v := range s.vehicles {
		if !v.Ignition {
			continue
		}

		// Advance waypoint progress
		p1 := v.Waypoints[v.CurrentIndex]
		nextIdx := (v.CurrentIndex + 1) % len(v.Waypoints)
		p2 := v.Waypoints[nextIdx]

		v.Progress += 0.05 + (rand.Float64() * 0.02)
		if v.Progress >= 1.0 {
			v.Progress = 0.0
			v.CurrentIndex = nextIdx
			p1 = v.Waypoints[v.CurrentIndex]
			p2 = v.Waypoints[(v.CurrentIndex+1)%len(v.Waypoints)]
		}

		// Linear interpolation between waypoints
		lat := p1.Lat + (p2.Lat-p1.Lat)*v.Progress + ((rand.Float64() - 0.5) * 0.0002)
		lng := p1.Lng + (p2.Lng-p1.Lng)*v.Progress + ((rand.Float64() - 0.5) * 0.0002)

		// Heading
		heading := CalculateHeading(p1.Lat, p1.Lng, p2.Lat, p2.Lng)
		v.Heading = heading

		// Speed variation
		speed := v.SpeedKmh + ((rand.Float64() - 0.5) * 4.0)
		if speed < 20 {
			speed = 20
		}
		if speed > 65 {
			speed = 65
		}

		// Check geofence status
		currPoint := geofence.Point{Lat: lat, Lng: lng}
		activeGF := ""
		for _, gf := range s.geofences {
			if geofence.IsPointInPolygon(currPoint, gf.Polygon) {
				activeGF = gf.Name
				break
			}
		}
		if activeGF != "" {
			v.ActiveGeofence = activeGF
		}

		// Packet type
		pktType := PacketTypeNormal
		status := "MOVING"
		if v.EmergencySOS {
			pktType = PacketTypeEmergency
			status = "SOS"
		} else if speed > 60 {
			pktType = PacketTypeOverSpeed
			status = "OVERSPEED"
		} else if speed < 5 {
			status = "IDLE"
		}

		packet := &AIS140Packet{
			VendorID:        "RAJMINES",
			FirmwareVersion: "1.0.4",
			PacketType:      pktType,
			IMEI:            v.IMEI,
			VehicleRegNo:    v.RegNo,
			GPSFix:          true,
			Timestamp:       time.Now().UTC(),
			Latitude:        lat,
			Longitude:       lng,
			Speed:           math.Round(speed*10) / 10,
			Heading:         math.Round(heading*10) / 10,
			NumSatellites:   12 + rand.Intn(4),
			Altitude:        380.0 + (rand.Float64() * 20.0),
			PDOP:            1.2,
			HDOP:            0.9,
			NetworkOperator: "Airtel 4G-M2M",
			Ignition:        v.Ignition,
			MainPower:       v.MainPower,
			InternalBatt:    v.BattVolts,
			EmergencySOS:    v.EmergencySOS,
			TamperAlert:     !v.MainPower,
			DigitalInputs:   "0101",
			AnalogInputs:    "0024",
			ChecksumValid:   true,
		}

		packet.RawPacket = FormatAIS140(packet)

		update := &TelemetryUpdate{
			VehicleID:       v.VehicleID,
			VehicleRegNo:    v.RegNo,
			IMEI:            v.IMEI,
			PacketType:      pktType,
			Latitude:        lat,
			Longitude:       lng,
			Speed:           packet.Speed,
			Heading:         packet.Heading,
			Altitude:        packet.Altitude,
			Satellites:      packet.NumSatellites,
			Ignition:        v.Ignition,
			MainPower:       v.MainPower,
			InternalBatt:    v.BattVolts,
			EmergencySOS:    v.EmergencySOS,
			TamperAlert:     !v.MainPower,
			Status:          status,
			Timestamp:       packet.Timestamp,
			ActiveGeofence:  v.ActiveGeofence,
			ERavannaPassNo:  v.ERavannaPassNo,
			MineralType:     v.MineralType,
		}

		if onPacketGenerated != nil {
			onPacketGenerated(packet, update)
		}
	}
}
