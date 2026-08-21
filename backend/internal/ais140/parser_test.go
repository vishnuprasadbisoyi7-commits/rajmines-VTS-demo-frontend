package ais140

import (
	"testing"
)

func TestParseAIS140(t *testing.T) {
	raw := "$$RAJMINES,1.0.4,NR,864920047382910,RJ14GB9821,1,20082026,113045,26.912434,N,75.787271,E,42.5,185.0,12,390.0,1.2,0.9,Airtel,1,1,4.12,0,0,0101,0024*3A"
	packet, err := ParseAIS140(raw)
	if err != nil {
		t.Fatalf("ParseAIS140 failed: %v", err)
	}

	if packet.VendorID != "RAJMINES" {
		t.Errorf("expected VendorID RAJMINES, got %s", packet.VendorID)
	}
	if packet.PacketType != PacketTypeNormal {
		t.Errorf("expected PacketType NR, got %s", packet.PacketType)
	}
	if packet.VehicleRegNo != "RJ14GB9821" {
		t.Errorf("expected VehicleRegNo RJ14GB9821, got %s", packet.VehicleRegNo)
	}
	if !packet.GPSFix {
		t.Errorf("expected GPSFix true, got false")
	}
	if packet.Speed != 42.5 {
		t.Errorf("expected Speed 42.5, got %f", packet.Speed)
	}
	if !packet.Ignition {
		t.Errorf("expected Ignition true, got false")
	}
}

func TestFormatAIS140(t *testing.T) {
	packet := &AIS140Packet{
		VendorID:        "RAJMINES",
		FirmwareVersion: "1.0.4",
		PacketType:      PacketTypeEmergency,
		IMEI:            "864920047382910",
		VehicleRegNo:    "RJ14GB9821",
		GPSFix:          true,
		Latitude:        26.912434,
		Longitude:       75.787271,
		Speed:           55.0,
		Heading:         90.0,
		NumSatellites:   14,
		Altitude:        400.0,
		PDOP:            1.1,
		HDOP:            0.8,
		NetworkOperator: "Airtel",
		Ignition:        true,
		MainPower:       true,
		InternalBatt:    4.15,
		EmergencySOS:    true,
	}

	formatted := FormatAIS140(packet)
	if formatted == "" {
		t.Fatal("FormatAIS140 returned empty string")
	}

	parsed, err := ParseAIS140(formatted)
	if err != nil {
		t.Fatalf("failed to re-parse formatted AIS-140 packet: %v", err)
	}

	if parsed.PacketType != PacketTypeEmergency {
		t.Errorf("expected PacketType EA, got %s", parsed.PacketType)
	}
	if !parsed.EmergencySOS {
		t.Errorf("expected EmergencySOS true")
	}
}
