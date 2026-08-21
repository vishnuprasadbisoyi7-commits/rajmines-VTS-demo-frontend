package geofence

import (
	"math"
)

// Point represents a 2D latitude/longitude coordinate
type Point struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// GeofenceZone represents a mining boundary, checkpoint, or corridor
type GeofenceZone struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	ZoneType    string   `json:"zone_type"` // MINING_LEASE, WEIGHBRIDGE, CHECKPOST, RESTRICTED, CORRIDOR
	MineralType string   `json:"mineral_type"`
	SpeedLimit  float64  `json:"speed_limit"` // km/h
	Polygon     []Point  `json:"polygon"`
	BufferMeters float64 `json:"buffer_meters"`
	CenterLat   float64  `json:"center_lat"`
	CenterLng   float64  `json:"center_lng"`
}

// IsPointInPolygon uses Ray-Casting algorithm to check if point is inside a polygon
func IsPointInPolygon(p Point, polygon []Point) bool {
	if len(polygon) < 3 {
		return false
	}
	inside := false
	j := len(polygon) - 1
	for i := 0; i < len(polygon); i++ {
		xi, yi := polygon[i].Lng, polygon[i].Lat
		xj, yj := polygon[j].Lng, polygon[j].Lat

		intersect := ((yi > p.Lat) != (yj > p.Lat)) &&
			(p.Lng < (xj-xi)*(p.Lat-yi)/(yj-yi)+xi)
		if intersect {
			inside = !inside
		}
		j = i
	}
	return inside
}

// DistanceHaversineMeters calculates great-circle distance between two coordinates in meters
func DistanceHaversineMeters(p1, p2 Point) float64 {
	const earthRadius = 6371000 // meters
	dLat := (p2.Lat - p1.Lat) * math.Pi / 180
	dLng := (p2.Lng - p1.Lng) * math.Pi / 180
	lat1Rad := p1.Lat * math.Pi / 180
	lat2Rad := p2.Lat * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadius * c
}

// GetDefaultRajasthanMiningGeofences returns major mining lease zones and checkpoints in Rajasthan
func GetDefaultRajasthanMiningGeofences() []GeofenceZone {
	return []GeofenceZone{
		{
			ID:          "GF-RAJ-001",
			Name:        "Makrana Marble Mining Cluster - Zone A",
			ZoneType:    "MINING_LEASE",
			MineralType: "White Marble",
			SpeedLimit:  35,
			CenterLat:   27.0425,
			CenterLng:   74.7214,
			BufferMeters: 50,
			Polygon: []Point{
				{Lat: 27.0500, Lng: 74.7100},
				{Lat: 27.0520, Lng: 74.7350},
				{Lat: 27.0350, Lng: 74.7400},
				{Lat: 27.0320, Lng: 74.7150},
				{Lat: 27.0500, Lng: 74.7100},
			},
		},
		{
			ID:          "GF-RAJ-002",
			Name:        "Kishangarh Marble Processing & Stockyard",
			ZoneType:    "STOCKYARD",
			MineralType: "Marble & Granite",
			SpeedLimit:  30,
			CenterLat:   26.5780,
			CenterLng:   74.8620,
			BufferMeters: 50,
			Polygon: []Point{
				{Lat: 26.5850, Lng: 74.8500},
				{Lat: 26.5870, Lng: 74.8750},
				{Lat: 26.5700, Lng: 74.8780},
				{Lat: 26.5680, Lng: 74.8520},
				{Lat: 26.5850, Lng: 74.8500},
			},
		},
		{
			ID:          "GF-RAJ-003",
			Name:        "Jodhpur Sandstone & Rhyolite Mining Basin",
			ZoneType:    "MINING_LEASE",
			MineralType: "Sandstone",
			SpeedLimit:  40,
			CenterLat:   26.2980,
			CenterLng:   73.0180,
			BufferMeters: 60,
			Polygon: []Point{
				{Lat: 26.3150, Lng: 73.0050},
				{Lat: 26.3180, Lng: 73.0350},
				{Lat: 26.2820, Lng: 73.0400},
				{Lat: 26.2800, Lng: 73.0100},
				{Lat: 26.3150, Lng: 73.0050},
			},
		},
		{
			ID:          "GF-RAJ-004",
			Name:        "Bhilwara Soapstone & Feldspar Area",
			ZoneType:    "MINING_LEASE",
			MineralType: "Soapstone & Quartz",
			SpeedLimit:  40,
			CenterLat:   25.3480,
			CenterLng:   74.6380,
			BufferMeters: 50,
			Polygon: []Point{
				{Lat: 25.3600, Lng: 74.6250},
				{Lat: 25.3620, Lng: 74.6500},
				{Lat: 25.3350, Lng: 74.6550},
				{Lat: 25.3320, Lng: 74.6300},
				{Lat: 25.3600, Lng: 74.6250},
			},
		},
		{
			ID:          "GF-RAJ-005",
			Name:        "Jaisalmer Limestone & Yellow Marble Block",
			ZoneType:    "MINING_LEASE",
			MineralType: "Limestone",
			SpeedLimit:  45,
			CenterLat:   26.9150,
			CenterLng:   70.9080,
			BufferMeters: 80,
			Polygon: []Point{
				{Lat: 26.9300, Lng: 70.8900},
				{Lat: 26.9320, Lng: 70.9250},
				{Lat: 26.9000, Lng: 70.9300},
				{Lat: 26.8980, Lng: 70.8950},
				{Lat: 26.9300, Lng: 70.8900},
			},
		},
		{
			ID:          "GF-RAJ-006",
			Name:        "DMG Naka & Electronic Weighbridge - Bagru Checkpost",
			ZoneType:    "CHECKPOST",
			MineralType: "All Minerals",
			SpeedLimit:  20,
			CenterLat:   26.8120,
			CenterLng:   75.5420,
			BufferMeters: 30,
			Polygon: []Point{
				{Lat: 26.8180, Lng: 75.5350},
				{Lat: 26.8190, Lng: 75.5500},
				{Lat: 26.8060, Lng: 75.5510},
				{Lat: 26.8050, Lng: 75.5360},
				{Lat: 26.8180, Lng: 75.5350},
			},
		},
	}
}
