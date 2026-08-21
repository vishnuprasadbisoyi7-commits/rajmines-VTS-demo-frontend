package api

import (
	"encoding/json"
	"net/http"
)

// GISLayerConfig represents a switchable Rajdharaa GIS map layer
type GISLayerConfig struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"` // tile, wms, wmts, vector
	URL         string `json:"url"`
	Attribution string `json:"attribution"`
	IsDefault   bool   `json:"is_default"`
	MaxZoom     int    `json:"max_zoom"`
	MinZoom     int    `json:"min_zoom"`
}

// GetRajdharaaGISLayers returns configured map layers for Rajdharaa GIS
func GetRajdharaaGISLayers() []GISLayerConfig {
	return []GISLayerConfig{
		{
			ID:          "rajdharaa-satellite-hybrid",
			Name:        "Rajdharaa Satellite Hybrid (GIS Rajasthan)",
			Type:        "tile",
			URL:         "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
			Attribution: "&copy; Rajdharaa GIS / DoIT&C Govt. of Rajasthan &copy; Esri World Imagery",
			IsDefault:   true,
			MaxZoom:     19,
			MinZoom:     5,
		},
		{
			ID:          "rajdharaa-base-carto",
			Name:        "Rajdharaa Topographic / Carto Base",
			Type:        "tile",
			URL:         "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
			Attribution: "&copy; Rajdharaa State Spatial Data Infrastructure &copy; CARTO",
			IsDefault:   false,
			MaxZoom:     19,
			MinZoom:     5,
		},
		{
			ID:          "rajdharaa-dark-night",
			Name:        "Rajdharaa Night Surveillance Map",
			Type:        "tile",
			URL:         "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
			Attribution: "&copy; Rajdharaa Mining Surveillance Network &copy; CARTO Dark",
			IsDefault:   false,
			MaxZoom:     19,
			MinZoom:     5,
		},
		{
			ID:          "osm-standard",
			Name:        "OpenStreetMap Standard",
			Type:        "tile",
			URL:         "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
			Attribution: "&copy; OpenStreetMap contributors",
			IsDefault:   false,
			MaxZoom:     19,
			MinZoom:     5,
		},
	}
}

// CheckpostFeature represents a DMG Naka / Weighbridge
type CheckpostFeature struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	District     string    `json:"district"`
	Type         string    `json:"type"` // WEIGHBRIDGE, CHECKPOST, TOLL_GATE
	Coordinates  [2]float64 `json:"coordinates"` // [lat, lng]
	CCTVActive   bool      `json:"cctv_active"`
	ANPRActive   bool      `json:"anpr_active"`
	DailyScans   int       `json:"daily_scans"`
}

// GetRajdharaaCheckposts returns DMG checkposts across Rajasthan
func GetRajdharaaCheckposts() []CheckpostFeature {
	return []CheckpostFeature{
		{
			ID: "NAKA-01", Name: "Bagru Mining Vigilance Naka & Weighbridge",
			District: "Jaipur", Type: "WEIGHBRIDGE", Coordinates: [2]float64{26.8120, 75.5420},
			CCTVActive: true, ANPRActive: true, DailyScans: 412,
		},
		{
			ID: "NAKA-02", Name: "Kishangarh Marble Toll Plaza & Verification Point",
			District: "Ajmer", Type: "CHECKPOST", Coordinates: [2]float64{26.5780, 74.8620},
			CCTVActive: true, ANPRActive: true, DailyScans: 680,
		},
		{
			ID: "NAKA-03", Name: "Mandore Sandstone Inspection Barrier",
			District: "Jodhpur", Type: "CHECKPOST", Coordinates: [2]float64{26.3420, 73.0480},
			CCTVActive: true, ANPRActive: false, DailyScans: 285,
		},
		{
			ID: "NAKA-04", Name: "Nimbahera Limestone Transit Gate",
			District: "Chittorgarh", Type: "WEIGHBRIDGE", Coordinates: [2]float64{24.6210, 74.6850},
			CCTVActive: true, ANPRActive: true, DailyScans: 530,
		},
		{
			ID: "NAKA-05", Name: "Pokhran Mineral Vigilance Post",
			District: "Jaisalmer", Type: "CHECKPOST", Coordinates: [2]float64{26.9210, 71.9180},
			CCTVActive: true, ANPRActive: true, DailyScans: 190,
		},
		{
			ID: "NAKA-06", Name: "Makrana Station Road DMG Checkpost",
			District: "Nagaur", Type: "CHECKPOST", Coordinates: [2]float64{27.0425, 74.7214},
			CCTVActive: true, ANPRActive: true, DailyScans: 360,
		},
	}
}

// HandleGISLayers returns available Rajdharaa GIS layers
func (h *Handler) HandleGISLayers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"provider":     "Rajdharaa - Department of Information Technology & Communication (DoIT&C), Govt. of Rajasthan",
		"portal_url":   "https://gis.rajasthan.gov.in/",
		"layers":       GetRajdharaaGISLayers(),
		"checkposts":   GetRajdharaaCheckposts(),
		"state_center": []float64{26.5780, 74.8620}, // Rajasthan Center
		"default_zoom": 7,
	})
}
