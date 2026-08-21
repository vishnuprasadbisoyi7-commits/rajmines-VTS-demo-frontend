package ais140

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

// ParseAIS140 parses an AIS-140 formatted ASCII packet string
// Example: $$RAJMINES,1.0.4,NR,864920047382910,RJ14GB9821,1,20082026,113045,26.912434,N,75.787271,E,42.5,185.0,12,390.0,1.2,0.9,Airtel,1,1,4.12,0,0,0101,0024*3A
func ParseAIS140(raw string) (*AIS140Packet, error) {
	raw = strings.TrimSpace(raw)
	if !strings.HasPrefix(raw, "$$") && !strings.HasPrefix(raw, "$") {
		return nil, fmt.Errorf("invalid packet header: expected $$ or $")
	}

	trimmed := strings.TrimPrefix(raw, "$$")
	trimmed = strings.TrimPrefix(trimmed, "$")

	// Split by checksum delimiter '*'
	parts := strings.Split(trimmed, "*")
	body := parts[0]
	var receivedCRC string
	if len(parts) > 1 {
		receivedCRC = parts[1]
	}

	fields := strings.Split(body, ",")
	if len(fields) < 15 {
		return nil, fmt.Errorf("insufficient fields: got %d, expected at least 15", len(fields))
	}

	packet := &AIS140Packet{
		RawPacket: raw,
	}

	// 1. Vendor ID
	packet.VendorID = fields[0]

	// 2. Firmware Version
	if len(fields) > 1 {
		packet.FirmwareVersion = fields[1]
	}

	// 3. Packet Type
	if len(fields) > 2 {
		packet.PacketType = PacketType(fields[2])
	}

	// 4. IMEI
	if len(fields) > 3 {
		packet.IMEI = fields[3]
	}

	// 5. Vehicle Reg No
	if len(fields) > 4 {
		packet.VehicleRegNo = fields[4]
	}

	// 6. GPS Fix (1/0 or A/V)
	if len(fields) > 5 {
		fixStr := strings.ToUpper(fields[5])
		packet.GPSFix = (fixStr == "1" || fixStr == "A")
	}

	// 7 & 8. Date (DDMMYYYY) & Time (HHMMSS)
	if len(fields) > 7 {
		dateStr := fields[6]
		timeStr := fields[7]
		if len(dateStr) == 8 && len(timeStr) >= 6 {
			parsedTime, err := time.Parse("02012006150405", dateStr+timeStr[:6])
			if err == nil {
				packet.Timestamp = parsedTime
			} else {
				packet.Timestamp = time.Now().UTC()
			}
		} else {
			packet.Timestamp = time.Now().UTC()
		}
	} else {
		packet.Timestamp = time.Now().UTC()
	}

	// 9 & 10. Latitude & Direction
	if len(fields) > 9 {
		lat, _ := strconv.ParseFloat(fields[8], 64)
		if strings.ToUpper(fields[9]) == "S" {
			lat = -lat
		}
		packet.Latitude = lat
	}

	// 11 & 12. Longitude & Direction
	if len(fields) > 11 {
		lng, _ := strconv.ParseFloat(fields[10], 64)
		if strings.ToUpper(fields[12]) == "W" {
			lng = -lng
		}
		packet.Longitude = lng
	}

	// 13. Speed (km/h)
	if len(fields) > 12 {
		spd, _ := strconv.ParseFloat(fields[12], 64)
		packet.Speed = spd
	}

	// 14. Heading (0-360)
	if len(fields) > 13 {
		hdg, _ := strconv.ParseFloat(fields[13], 64)
		packet.Heading = hdg
	}

	// 15. Satellites
	if len(fields) > 14 {
		sats, _ := strconv.Atoi(fields[14])
		packet.NumSatellites = sats
	}

	// 16. Altitude (m)
	if len(fields) > 15 {
		alt, _ := strconv.ParseFloat(fields[15], 64)
		packet.Altitude = alt
	}

	// 17. PDOP
	if len(fields) > 16 {
		pdop, _ := strconv.ParseFloat(fields[16], 64)
		packet.PDOP = pdop
	}

	// 18. HDOP
	if len(fields) > 17 {
		hdop, _ := strconv.ParseFloat(fields[17], 64)
		packet.HDOP = hdop
	}

	// 19. Network Operator
	if len(fields) > 18 {
		packet.NetworkOperator = fields[18]
	}

	// 20. Ignition (1/0)
	if len(fields) > 19 {
		packet.Ignition = (fields[19] == "1" || strings.ToLower(fields[19]) == "true")
	}

	// 21. Main Power (1/0)
	if len(fields) > 20 {
		packet.MainPower = (fields[20] == "1" || strings.ToLower(fields[20]) == "true")
	}

	// 22. Internal Battery (Volts)
	if len(fields) > 21 {
		batt, _ := strconv.ParseFloat(fields[21], 64)
		packet.InternalBatt = batt
	}

	// 23. Emergency SOS (1/0)
	if len(fields) > 22 {
		packet.EmergencySOS = (fields[22] == "1" || strings.ToLower(fields[22]) == "true" || packet.PacketType == PacketTypeEmergency)
	}

	// 24. Tamper Alert (1/0)
	if len(fields) > 23 {
		packet.TamperAlert = (fields[23] == "1" || strings.ToLower(fields[23]) == "true" || packet.PacketType == PacketTypeTamper)
	}

	// 25. Digital Inputs
	if len(fields) > 24 {
		packet.DigitalInputs = fields[24]
	}

	// 26. Analog Inputs
	if len(fields) > 25 {
		packet.AnalogInputs = fields[25]
	}

	// Checksum validation
	calculatedCRC := CalculateChecksum(body)
	packet.ChecksumValid = strings.EqualFold(receivedCRC, calculatedCRC) || receivedCRC == ""

	return packet, nil
}

// FormatAIS140 serializes an AIS140Packet to a valid AIS-140 standard string
func FormatAIS140(p *AIS140Packet) string {
	latDir := "N"
	lat := p.Latitude
	if lat < 0 {
		latDir = "S"
		lat = -lat
	}

	lngDir := "E"
	lng := p.Longitude
	if lng < 0 {
		lngDir = "W"
		lng = -lng
	}

	fixStr := "0"
	if p.GPSFix {
		fixStr = "1"
	}

	ignStr := "0"
	if p.Ignition {
		ignStr = "1"
	}

	pwrStr := "0"
	if p.MainPower {
		pwrStr = "1"
	}

	sosStr := "0"
	if p.EmergencySOS {
		sosStr = "1"
	}

	tamperStr := "0"
	if p.TamperAlert {
		tamperStr = "1"
	}

	dateStr := p.Timestamp.Format("02012006")
	timeStr := p.Timestamp.Format("150405")

	vendor := p.VendorID
	if vendor == "" {
		vendor = "RAJMINES"
	}
	fw := p.FirmwareVersion
	if fw == "" {
		fw = "1.0.4"
	}

	body := fmt.Sprintf("%s,%s,%s,%s,%s,%s,%s,%s,%.6f,%s,%.6f,%s,%.1f,%.1f,%d,%.1f,%.1f,%.1f,%s,%s,%s,%.2f,%s,%s,%s,%s",
		vendor,
		fw,
		p.PacketType,
		p.IMEI,
		p.VehicleRegNo,
		fixStr,
		dateStr,
		timeStr,
		lat,
		latDir,
		lng,
		lngDir,
		p.Speed,
		p.Heading,
		p.NumSatellites,
		p.Altitude,
		p.PDOP,
		p.HDOP,
		p.NetworkOperator,
		ignStr,
		pwrStr,
		p.InternalBatt,
		sosStr,
		tamperStr,
		p.DigitalInputs,
		p.AnalogInputs,
	)

	crc := CalculateChecksum(body)
	return fmt.Sprintf("$$%s*%s\r\n", body, crc)
}

// CalculateChecksum computes 8-bit XOR checksum in uppercase hex
func CalculateChecksum(s string) string {
	var xorVal byte = 0
	for i := 0; i < len(s); i++ {
		xorVal ^= s[i]
	}
	return fmt.Sprintf("%02X", xorVal)
}

// CalculateHeading calculates compass heading between two coordinate points
func CalculateHeading(lat1, lon1, lat2, lon2 float64) float64 {
	y := math.Sin((lon2-lon1)*math.Pi/180) * math.Cos(lat2*math.Pi/180)
	x := math.Cos(lat1*math.Pi/180)*math.Sin(lat2*math.Pi/180) -
		math.Sin(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*math.Cos((lon2-lon1)*math.Pi/180)
	heading := math.Atan2(y, x) * 180 / math.Pi
	if heading < 0 {
		heading += 360
	}
	return heading
}
