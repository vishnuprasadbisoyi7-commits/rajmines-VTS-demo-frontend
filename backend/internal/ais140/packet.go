package ais140

import "time"

// PacketType represents standard AIS-140 packet identifiers
type PacketType string

const (
	PacketTypeNormal     PacketType = "NR" // Normal Periodic Tracking
	PacketTypeEmergency  PacketType = "EA" // Emergency Alert / SOS Panic
	PacketTypeIgnitionOn PacketType = "IN" // Ignition Turned On
	PacketTypeIgnitionOff PacketType = "IF" // Ignition Turned Off
	PacketTypeOverSpeed  PacketType = "OS" // Over-Speed Alert (> Speed Limit)
	PacketTypeTamper     PacketType = "TA" // Battery Disconnect / GPS Antenna Tamper
	PacketTypeHealthPing PacketType = "HP" // Health Ping
)

// AIS140Packet represents a fully parsed AIS-140 standard telemetry frame
type AIS140Packet struct {
	RawPacket       string     `json:"raw_packet"`
	VendorID        string     `json:"vendor_id"`
	FirmwareVersion string     `json:"firmware_version"`
	PacketType      PacketType `json:"packet_type"`
	IMEI            string     `json:"imei"`
	VehicleRegNo    string     `json:"vehicle_reg_no"`
	GPSFix          bool       `json:"gps_fix"`
	Timestamp       time.Time  `json:"timestamp"`
	Latitude        float64    `json:"latitude"`
	Longitude       float64    `json:"longitude"`
	Speed           float64    `json:"speed_kmh"`
	Heading         float64    `json:"heading_deg"`
	NumSatellites   int        `json:"satellites"`
	Altitude        float64    `json:"altitude_m"`
	PDOP            float64    `json:"pdop"`
	HDOP            float64    `json:"hdop"`
	NetworkOperator string     `json:"network_operator"`
	Ignition        bool       `json:"ignition"`
	MainPower       bool       `json:"main_power"`
	InternalBatt    float64    `json:"internal_battery_volts"`
	EmergencySOS    bool       `json:"emergency_sos"`
	TamperAlert     bool       `json:"tamper_alert"`
	GSMStrengthCSQ  int        `json:"gsm_signal_csq"`
	DigitalInputs   string     `json:"digital_inputs"`
	AnalogInputs    string     `json:"analog_inputs"`
	ChecksumValid   bool       `json:"checksum_valid"`
}

// TelemetryUpdate is the compact broadcast message sent over Kafka and WebSockets
type TelemetryUpdate struct {
	VehicleID       string     `json:"vehicle_id"`
	VehicleRegNo    string     `json:"vehicle_reg_no"`
	IMEI            string     `json:"imei"`
	PacketType      PacketType `json:"packet_type"`
	Latitude        float64    `json:"latitude"`
	Longitude       float64    `json:"longitude"`
	Speed           float64    `json:"speed"`
	Heading         float64    `json:"heading"`
	Altitude        float64    `json:"altitude"`
	Satellites      int        `json:"satellites"`
	Ignition        bool       `json:"ignition"`
	MainPower       bool       `json:"main_power"`
	InternalBatt    float64    `json:"internal_batt"`
	EmergencySOS    bool       `json:"emergency_sos"`
	TamperAlert     bool       `json:"tamper_alert"`
	Status          string     `json:"status"` // MOVING, IDLE, STOPPED, SOS, OVERSPEED
	Timestamp       time.Time  `json:"timestamp"`
	ActiveGeofence  string     `json:"active_geofence,omitempty"`
	ERavannaPassNo  string     `json:"e_ravanna_pass_no,omitempty"`
	MineralType     string     `json:"mineral_type,omitempty"`
}
