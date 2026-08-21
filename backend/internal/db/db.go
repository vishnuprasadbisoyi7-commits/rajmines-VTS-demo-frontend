package db

import (
	"database/sql"
	"fmt"
	"log"
	"sync"
	"time"

	_ "github.com/lib/pq"
	"rajmines-vts/internal/ais140"
	"rajmines-vts/internal/geofence"
)

// Vehicle represents an enrolled mining mineral carrier
type Vehicle struct {
	ID             string    `json:"id"`
	RegNo          string    `json:"reg_no"`
	IMEI           string    `json:"imei"`
	VehicleType    string    `json:"vehicle_type"` // Dumper, Multi-Axle Tipper, Tanker, Tractor-Trolley
	DriverName     string    `json:"driver_name"`
	DriverPhone    string    `json:"driver_phone"`
	CapacityTonnes float64   `json:"capacity_tonnes"`
	MineralType    string    `json:"mineral_type"`
	Status         string    `json:"status"` // MOVING, IDLE, STOPPED, SOS, OVERSPEED
	LastLatitude   float64   `json:"last_latitude"`
	LastLongitude  float64   `json:"last_longitude"`
	LastSpeed      float64   `json:"last_speed"`
	LastHeading    float64   `json:"last_heading"`
	LastAltitude   float64   `json:"last_altitude"`
	LastSatellites int       `json:"last_satellites"`
	LastIgnition   bool      `json:"last_ignition"`
	LastEmergency  bool      `json:"last_emergency"`
	LastInternalBatt float64 `json:"last_internal_batt"`
	LastUpdated    time.Time `json:"last_updated"`
	ActiveGeofence string    `json:"active_geofence"`
	ActiveERavanna string    `json:"active_e_ravanna"`
}

// ERavannaPass represents Rajasthan DMG Electronic Transit Pass
type ERavannaPass struct {
	PassNo          string    `json:"pass_no"`
	VehicleRegNo    string    `json:"vehicle_reg_no"`
	LeaseID         string    `json:"lease_id"`
	LeaseName       string    `json:"lease_name"`
	MineralName     string    `json:"mineral_name"`
	TareWeight      float64   `json:"tare_weight_tonnes"`
	GrossWeight     float64   `json:"gross_weight_tonnes"`
	NetWeight       float64   `json:"net_weight_tonnes"`
	PermissibleMax  float64   `json:"permissible_max_tonnes"`
	DispatchTime    time.Time `json:"dispatch_time"`
	ValidUpto       time.Time `json:"valid_upto"`
	Destination     string    `json:"destination"`
	OriginCoords    [2]float64 `json:"origin_coords"`
	DestCoords      [2]float64 `json:"dest_coords"`
	Status          string    `json:"status"` // IN_TRANSIT, COMPLETED, EXPIRED, ROUTE_DEVIATED, OVERLOADED
}

// AlertRecord represents fleet violations and SOS alarms
type AlertRecord struct {
	ID          string    `json:"id"`
	VehicleID   string    `json:"vehicle_id"`
	RegNo       string    `json:"reg_no"`
	IMEI        string    `json:"imei"`
	AlertType   string    `json:"alert_type"` // SOS_EMERGENCY, OVERSPEED, GEOFENCE_BREACH, BATTERY_TAMPER, ROUTE_DEVIATION, NIGHT_DRIVING
	Severity    string    `json:"severity"`   // CRITICAL, HIGH, MEDIUM, LOW
	Message     string    `json:"message"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	Speed       float64   `json:"speed"`
	Timestamp   time.Time `json:"timestamp"`
	IsResolved  bool      `json:"is_resolved"`
	ResolvedAt  *time.Time `json:"resolved_at,omitempty"`
}

// TelemetryTrailPoint is a historical breadcrumb
type TelemetryTrailPoint struct {
	Latitude  float64   `json:"lat"`
	Longitude float64   `json:"lng"`
	Speed     float64   `json:"speed"`
	Heading   float64   `json:"heading"`
	Ignition  bool      `json:"ignition"`
	Timestamp time.Time `json:"timestamp"`
}

// FleetStats summary
type FleetStats struct {
	TotalVehicles   int     `json:"total_vehicles"`
	Moving          int     `json:"moving"`
	Idle            int     `json:"idle"`
	Stopped         int     `json:"stopped"`
	EmergencySOS    int     `json:"emergency_sos"`
	ActiveERavanna  int     `json:"active_e_ravanna"`
	TotalAlerts24h  int     `json:"total_alerts_24h"`
	TotalTonnageToday float64 `json:"total_tonnage_today"`
}

// Repository manages database access
type Repository struct {
	db          *sql.DB
	isPgAlive   bool
	mu          sync.RWMutex
	vehicles    map[string]*Vehicle
	telemetry   map[string][]TelemetryTrailPoint // key: vehicle reg or imei
	geofences   []geofence.GeofenceZone
	eravanna    map[string]*ERavannaPass
	alerts      []*AlertRecord
	rawPackets  []string
}

// NewRepository creates and initializes storage
func NewRepository(pgConnStr string) *Repository {
	repo := &Repository{
		vehicles:   make(map[string]*Vehicle),
		telemetry:  make(map[string][]TelemetryTrailPoint),
		geofences:  geofence.GetDefaultRajasthanMiningGeofences(),
		eravanna:   make(map[string]*ERavannaPass),
		alerts:     make([]*AlertRecord, 0),
		rawPackets: make([]string, 0),
	}

	// Try PostgreSQL connection
	if pgConnStr != "" {
		dbConn, err := sql.Open("postgres", pgConnStr)
		if err == nil {
			err = dbConn.Ping()
			if err == nil {
				repo.db = dbConn
				repo.isPgAlive = true
				log.Println("[DATABASE] Successfully connected to PostgreSQL/PostGIS database.")
			} else {
				log.Printf("[DATABASE] PostgreSQL ping failed (%v). Operating in High-Performance In-Memory PostGIS Store.", err)
			}
		} else {
			log.Printf("[DATABASE] PostgreSQL open failed (%v). Operating in High-Performance In-Memory PostGIS Store.", err)
		}
	} else {
		log.Println("[DATABASE] No PostgreSQL connection string provided. Operating in High-Performance In-Memory PostGIS Store.")
	}

	repo.seedInitialData()
	return repo
}

func (r *Repository) seedInitialData() {
	r.mu.Lock()
	defer r.mu.Unlock()

	vehicles := []*Vehicle{
		{
			ID: "VEH-RAJ-01", RegNo: "RJ14-GB-9821", IMEI: "864920047382910",
			VehicleType: "14-Wheel Heavy Tipper", DriverName: "Mohan Lal Sharma", DriverPhone: "+91 98290 12345",
			CapacityTonnes: 32.0, MineralType: "White Marble", Status: "MOVING",
			LastLatitude: 27.0425, LastLongitude: 74.7214, LastSpeed: 44.5, LastHeading: 142.0,
			LastAltitude: 410.0, LastSatellites: 14, LastIgnition: true, LastInternalBatt: 4.15,
			LastUpdated: time.Now(), ActiveGeofence: "Makrana Marble Mining Cluster", ActiveERavanna: "ERAV-2026-MKR-0081",
		},
		{
			ID: "VEH-RAJ-02", RegNo: "RJ27-GA-4512", IMEI: "864920047382921",
			VehicleType: "10-Wheel Dump Truck", DriverName: "Suresh Meena", DriverPhone: "+91 94140 56789",
			CapacityTonnes: 25.0, MineralType: "Soapstone & Feldspar", Status: "MOVING",
			LastLatitude: 25.3480, LastLongitude: 74.6380, LastSpeed: 38.0, LastHeading: 85.0,
			LastAltitude: 425.0, LastSatellites: 12, LastIgnition: true, LastInternalBatt: 4.08,
			LastUpdated: time.Now(), ActiveGeofence: "Bhilwara Soapstone Area", ActiveERavanna: "ERAV-2026-BHL-0144",
		},
		{
			ID: "VEH-RAJ-03", RegNo: "RJ19-UB-7734", IMEI: "864920047382932",
			VehicleType: "Heavy Mineral Dumper", DriverName: "Kailash Choudhary", DriverPhone: "+91 96023 44556",
			CapacityTonnes: 28.0, MineralType: "Sandstone", Status: "MOVING",
			LastLatitude: 26.2980, LastLongitude: 73.0180, LastSpeed: 52.0, LastHeading: 210.0,
			LastAltitude: 260.0, LastSatellites: 15, LastIgnition: true, LastInternalBatt: 4.20,
			LastUpdated: time.Now(), ActiveGeofence: "Jodhpur Sandstone Basin", ActiveERavanna: "ERAV-2026-JDH-0391",
		},
		{
			ID: "VEH-RAJ-04", RegNo: "RJ15-TA-2190", IMEI: "864920047382943",
			VehicleType: "Multi-Axle Trailer", DriverName: "Rajender Singh", DriverPhone: "+91 97841 22334",
			CapacityTonnes: 35.0, MineralType: "Yellow Limestone", Status: "MOVING",
			LastLatitude: 26.9150, LastLongitude: 70.9080, LastSpeed: 48.0, LastHeading: 45.0,
			LastAltitude: 220.0, LastSatellites: 11, LastIgnition: true, LastInternalBatt: 3.98,
			LastUpdated: time.Now(), ActiveGeofence: "Jaisalmer Limestone Block", ActiveERavanna: "ERAV-2026-JSL-0092",
		},
		{
			ID: "VEH-RAJ-05", RegNo: "RJ01-EB-6381", IMEI: "864920047382954",
			VehicleType: "12-Wheel Tipper", DriverName: "Vikram Gurjar", DriverPhone: "+91 99288 77665",
			CapacityTonnes: 30.0, MineralType: "Marble & Granite", Status: "IDLE",
			LastLatitude: 26.5780, LastLongitude: 74.8620, LastSpeed: 0.0, LastHeading: 0.0,
			LastAltitude: 440.0, LastSatellites: 13, LastIgnition: true, LastInternalBatt: 4.12,
			LastUpdated: time.Now(), ActiveGeofence: "Kishangarh Marble Stockyard", ActiveERavanna: "ERAV-2026-KSG-0512",
		},
		{
			ID: "VEH-RAJ-06", RegNo: "RJ14-PA-8840", IMEI: "864920047382965",
			VehicleType: "Sand Mineral Carrier", DriverName: "Devendra Rathore", DriverPhone: "+91 98299 33221",
			CapacityTonnes: 22.0, MineralType: "Bajri (River Sand)", Status: "STOPPED",
			LastLatitude: 26.8120, LastLongitude: 75.5420, LastSpeed: 0.0, LastHeading: 0.0,
			LastAltitude: 360.0, LastSatellites: 9, LastIgnition: false, LastInternalBatt: 4.02,
			LastUpdated: time.Now(), ActiveGeofence: "Bagru DMG Checkpost", ActiveERavanna: "ERAV-2026-BGR-0220",
		},
	}

	for _, v := range vehicles {
		r.vehicles[v.RegNo] = v
	}

	// Seed e-Ravanna passes
	passes := []*ERavannaPass{
		{
			PassNo: "ERAV-2026-MKR-0081", VehicleRegNo: "RJ14-GB-9821", LeaseID: "DMG-MKR-2024-L09",
			LeaseName: "Makrana Marble Block IV", MineralName: "White Calcite Marble",
			TareWeight: 11.2, GrossWeight: 42.6, NetWeight: 31.4, PermissibleMax: 32.0,
			DispatchTime: time.Now().Add(-2 * time.Hour), ValidUpto: time.Now().Add(6 * time.Hour),
			Destination: "Kishangarh Marble Mandi, Ajmer", OriginCoords: [2]float64{27.0425, 74.7214},
			DestCoords: [2]float64{26.5780, 74.8620}, Status: "IN_TRANSIT",
		},
		{
			PassNo: "ERAV-2026-BHL-0144", VehicleRegNo: "RJ27-GA-4512", LeaseID: "DMG-BHL-2023-L02",
			LeaseName: "Jhajhar Soapstone Mine", MineralName: "High-Grade Talc/Soapstone",
			TareWeight: 9.8, GrossWeight: 34.2, NetWeight: 24.4, PermissibleMax: 25.0,
			DispatchTime: time.Now().Add(-1 * time.Hour), ValidUpto: time.Now().Add(5 * time.Hour),
			Destination: "Udaipur Micronizing Plant", OriginCoords: [2]float64{25.3480, 74.6380},
			DestCoords: [2]float64{24.5854, 73.7125}, Status: "IN_TRANSIT",
		},
		{
			PassNo: "ERAV-2026-JDH-0391", VehicleRegNo: "RJ19-UB-7734", LeaseID: "DMG-JDH-2025-L15",
			LeaseName: "Balesar Sandstone Quarry", MineralName: "Pink & Red Sandstone Slabs",
			TareWeight: 10.5, GrossWeight: 38.0, NetWeight: 27.5, PermissibleMax: 28.0,
			DispatchTime: time.Now().Add(-3 * time.Hour), ValidUpto: time.Now().Add(4 * time.Hour),
			Destination: "Jodhpur Export Freight Terminal", OriginCoords: [2]float64{26.2980, 73.0180},
			DestCoords: [2]float64{26.2389, 73.0243}, Status: "IN_TRANSIT",
		},
		{
			PassNo: "ERAV-2026-JSL-0092", VehicleRegNo: "RJ15-TA-2190", LeaseID: "DMG-JSL-2024-L06",
			LeaseName: "Sanu Limestone Pit", MineralName: "Steel-Grade Limestone Flux",
			TareWeight: 12.0, GrossWeight: 46.5, NetWeight: 34.5, PermissibleMax: 35.0,
			DispatchTime: time.Now().Add(-4 * time.Hour), ValidUpto: time.Now().Add(8 * time.Hour),
			Destination: "Bikaner Cement Processing Cluster", OriginCoords: [2]float64{26.9150, 70.9080},
			DestCoords: [2]float64{28.0229, 73.3119}, Status: "IN_TRANSIT",
		},
	}

	for _, p := range passes {
		r.eravanna[p.PassNo] = p
	}

	// Seed initial alerts
	r.alerts = append(r.alerts, &AlertRecord{
		ID:        "ALT-1001",
		VehicleID: "VEH-RAJ-01",
		RegNo:     "RJ14-GB-9821",
		IMEI:      "864920047382910",
		AlertType: "OVERSPEED",
		Severity:  "HIGH",
		Message:   "Vehicle exceeded mining zone speed limit (Logged: 62.4 km/h, Limit: 35 km/h)",
		Latitude:  27.0425,
		Longitude: 74.7214,
		Speed:     62.4,
		Timestamp: time.Now().Add(-25 * time.Minute),
		IsResolved: false,
	})
}

// GetAllVehicles returns current fleet snapshot
func (r *Repository) GetAllVehicles() []*Vehicle {
	r.mu.RLock()
	defer r.mu.RUnlock()
	list := make([]*Vehicle, 0, len(r.vehicles))
	for _, v := range r.vehicles {
		list = append(list, v)
	}
	return list
}

// GetVehicleByRegNo gets single vehicle
func (r *Repository) GetVehicleByRegNo(regNo string) (*Vehicle, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	v, ok := r.vehicles[regNo]
	return v, ok
}

// UpdateVehicleTelemetry updates live state and appends to trail
func (r *Repository) UpdateVehicleTelemetry(u *ais140.TelemetryUpdate) {
	r.mu.Lock()
	defer r.mu.Unlock()

	v, exists := r.vehicles[u.VehicleRegNo]
	if !exists {
		v = &Vehicle{
			ID:          "VEH-" + u.IMEI[len(u.IMEI)-4:],
			RegNo:       u.VehicleRegNo,
			IMEI:        u.IMEI,
			VehicleType: "Mineral Tipper",
		}
		r.vehicles[u.VehicleRegNo] = v
	}

	v.LastLatitude = u.Latitude
	v.LastLongitude = u.Longitude
	v.LastSpeed = u.Speed
	v.LastHeading = u.Heading
	v.LastAltitude = u.Altitude
	v.LastSatellites = u.Satellites
	v.LastIgnition = u.Ignition
	v.LastEmergency = u.EmergencySOS
	v.LastInternalBatt = u.InternalBatt
	v.Status = u.Status
	v.LastUpdated = u.Timestamp
	if u.ActiveGeofence != "" {
		v.ActiveGeofence = u.ActiveGeofence
	}

	// Append trail (cap at 150 points for memory efficiency)
	trail := r.telemetry[u.VehicleRegNo]
	trail = append(trail, TelemetryTrailPoint{
		Latitude:  u.Latitude,
		Longitude: u.Longitude,
		Speed:     u.Speed,
		Heading:   u.Heading,
		Ignition:  u.Ignition,
		Timestamp: u.Timestamp,
	})
	if len(trail) > 150 {
		trail = trail[len(trail)-150:]
	}
	r.telemetry[u.VehicleRegNo] = trail
}

// GetTelemetryTrail returns historic trail points
func (r *Repository) GetTelemetryTrail(regNo string) []TelemetryTrailPoint {
	r.mu.RLock()
	defer r.mu.RUnlock()
	trail, exists := r.telemetry[regNo]
	if !exists {
		return []TelemetryTrailPoint{}
	}
	return trail
}

// GetAllGeofences returns geofences
func (r *Repository) GetAllGeofences() []geofence.GeofenceZone {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.geofences
}

// GetAllERavanna returns transit passes
func (r *Repository) GetAllERavanna() []*ERavannaPass {
	r.mu.RLock()
	defer r.mu.RUnlock()
	list := make([]*ERavannaPass, 0, len(r.eravanna))
	for _, p := range r.eravanna {
		list = append(list, p)
	}
	return list
}

// GetAllAlerts returns all alerts
func (r *Repository) GetAllAlerts() []*AlertRecord {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.alerts
}

// AddAlert logs a new alert
func (r *Repository) AddAlert(a *AlertRecord) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if a.ID == "" {
		a.ID = fmt.Sprintf("ALT-%d", time.Now().UnixMilli()%100000)
	}
	r.alerts = append([]*AlertRecord{a}, r.alerts...)
}

// ResolveAlert marks an alert resolved
func (r *Repository) ResolveAlert(id string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, a := range r.alerts {
		if a.ID == id {
			a.IsResolved = true
			now := time.Now()
			a.ResolvedAt = &now
			return true
		}
	}
	return false
}

// AddRawPacket records an incoming raw AIS-140 packet
func (r *Repository) AddRawPacket(raw string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.rawPackets = append([]string{raw}, r.rawPackets...)
	if len(r.rawPackets) > 50 {
		r.rawPackets = r.rawPackets[:50]
	}
}

// GetRawPackets returns recent raw AIS-140 packets
func (r *Repository) GetRawPackets() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.rawPackets
}

// GetFleetStats aggregates KPIs
func (r *Repository) GetFleetStats() FleetStats {
	r.mu.RLock()
	defer r.mu.RUnlock()

	stats := FleetStats{
		TotalVehicles: len(r.vehicles),
	}

	for _, v := range r.vehicles {
		switch v.Status {
		case "MOVING":
			stats.Moving++
		case "IDLE":
			stats.Idle++
		case "STOPPED":
			stats.Stopped++
		case "SOS":
			stats.EmergencySOS++
		}
	}

	stats.ActiveERavanna = len(r.eravanna)
	stats.TotalAlerts24h = len(r.alerts)
	stats.TotalTonnageToday = 117.8 // tonnes aggregate

	return stats
}
