package geofence

import (
	"testing"
)

func TestIsPointInPolygon(t *testing.T) {
	poly := []Point{
		{Lat: 27.0, Lng: 74.0},
		{Lat: 27.0, Lng: 75.0},
		{Lat: 26.0, Lng: 75.0},
		{Lat: 26.0, Lng: 74.0},
		{Lat: 27.0, Lng: 74.0},
	}

	insidePoint := Point{Lat: 26.5, Lng: 74.5}
	outsidePoint := Point{Lat: 28.0, Lng: 74.5}

	if !IsPointInPolygon(insidePoint, poly) {
		t.Errorf("expected point to be inside polygon")
	}
	if IsPointInPolygon(outsidePoint, poly) {
		t.Errorf("expected point to be outside polygon")
	}
}

func TestDistanceHaversine(t *testing.T) {
	p1 := Point{Lat: 26.9124, Lng: 75.7873} // Jaipur
	p2 := Point{Lat: 26.4499, Lng: 74.6399} // Ajmer

	dist := DistanceHaversineMeters(p1, p2)
	// Jaipur to Ajmer is approx ~125 km (125,000 meters)
	if dist < 100000 || dist > 140000 {
		t.Errorf("expected distance between 100km and 140km, got %.1f meters", dist)
	}
}
