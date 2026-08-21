-- RajMines VTS (Vehicle Tracking System) Database Schema
-- Optimized for PostgreSQL 16 + PostGIS Extension

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. VEHICLES MASTER TABLE
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(64) PRIMARY KEY,
    reg_no VARCHAR(32) UNIQUE NOT NULL,
    imei VARCHAR(32) UNIQUE NOT NULL,
    vehicle_type VARCHAR(64) NOT NULL DEFAULT 'Mineral Tipper',
    driver_name VARCHAR(128),
    driver_phone VARCHAR(32),
    capacity_tonnes NUMERIC(6,2) DEFAULT 30.00,
    mineral_type VARCHAR(64),
    status VARCHAR(32) DEFAULT 'STOPPED', -- MOVING, IDLE, STOPPED, SOS, OVERSPEED
    last_latitude NUMERIC(10,7),
    last_longitude NUMERIC(10,7),
    last_speed NUMERIC(5,2) DEFAULT 0.00,
    last_heading NUMERIC(5,2) DEFAULT 0.00,
    last_altitude NUMERIC(6,1) DEFAULT 0.0,
    last_satellites INT DEFAULT 0,
    last_ignition BOOLEAN DEFAULT FALSE,
    last_emergency BOOLEAN DEFAULT FALSE,
    last_internal_batt NUMERIC(4,2) DEFAULT 4.10,
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. AIS-140 GPS TELEMETRY TIME-SERIES TABLE (SPATIAL WITH POSTGIS)
CREATE TABLE IF NOT EXISTS gps_telemetry (
    id BIGSERIAL PRIMARY KEY,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE CASCADE,
    imei VARCHAR(32) NOT NULL,
    packet_type VARCHAR(8) NOT NULL DEFAULT 'NR', -- NR, EA, IN, IF, TA, OS, HP
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    geom GEOMETRY(Point, 4326),
    speed_kmh NUMERIC(5,2) DEFAULT 0.0,
    heading_deg NUMERIC(5,2) DEFAULT 0.0,
    altitude_m NUMERIC(6,1) DEFAULT 0.0,
    satellites INT DEFAULT 0,
    pdop NUMERIC(4,2),
    hdop NUMERIC(4,2),
    network_operator VARCHAR(64),
    ignition BOOLEAN DEFAULT FALSE,
    main_power BOOLEAN DEFAULT TRUE,
    internal_battery_v NUMERIC(4,2),
    emergency_sos BOOLEAN DEFAULT FALSE,
    tamper_alert BOOLEAN DEFAULT FALSE,
    raw_packet TEXT,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Spatial and Time-series Indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_geom ON gps_telemetry USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_telemetry_imei_time ON gps_telemetry (imei, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_recorded_at ON gps_telemetry (recorded_at DESC);

-- 3. MINING LEASE & GEOFENCE ZONES TABLE (POSTGIS POLYGON)
CREATE TABLE IF NOT EXISTS geofences (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(256) NOT NULL,
    zone_type VARCHAR(64) NOT NULL, -- MINING_LEASE, STOCKYARD, CHECKPOST, WEIGHBRIDGE, RESTRICTED
    mineral_type VARCHAR(128),
    speed_limit NUMERIC(5,2) DEFAULT 40.0,
    buffer_meters NUMERIC(6,2) DEFAULT 50.0,
    center_lat NUMERIC(10,7),
    center_lng NUMERIC(10,7),
    geom GEOMETRY(Polygon, 4326),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_geofences_geom ON geofences USING GIST (geom);

-- 4. RAJASTHAN DMG e-RAVANNA (ELECTRONIC TRANSIT PASS) TABLE
CREATE TABLE IF NOT EXISTS e_ravanna_passes (
    pass_no VARCHAR(64) PRIMARY KEY,
    vehicle_reg_no VARCHAR(32) NOT NULL REFERENCES vehicles(reg_no),
    lease_id VARCHAR(64),
    lease_name VARCHAR(256),
    mineral_name VARCHAR(128),
    tare_weight_tonnes NUMERIC(6,2),
    gross_weight_tonnes NUMERIC(6,2),
    net_weight_tonnes NUMERIC(6,2),
    permissible_max_tonnes NUMERIC(6,2),
    dispatch_time TIMESTAMPTZ NOT NULL,
    valid_upto TIMESTAMPTZ NOT NULL,
    destination VARCHAR(256),
    origin_geom GEOMETRY(Point, 4326),
    dest_geom GEOMETRY(Point, 4326),
    corridor_geom GEOMETRY(LineString, 4326),
    status VARCHAR(32) DEFAULT 'IN_TRANSIT', -- IN_TRANSIT, COMPLETED, EXPIRED, ROUTE_DEVIATED, OVERLOADED
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. ALERTS & VIOLATIONS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    reg_no VARCHAR(32),
    imei VARCHAR(32),
    alert_type VARCHAR(64) NOT NULL, -- SOS_EMERGENCY, OVERSPEED, GEOFENCE_BREACH, BATTERY_TAMPER, ROUTE_DEVIATION
    severity VARCHAR(16) NOT NULL DEFAULT 'HIGH', -- CRITICAL, HIGH, MEDIUM, LOW
    message TEXT NOT NULL,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    geom GEOMETRY(Point, 4326),
    speed NUMERIC(5,2),
    recorded_at TIMESTAMPTZ NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts (is_resolved, recorded_at DESC);
