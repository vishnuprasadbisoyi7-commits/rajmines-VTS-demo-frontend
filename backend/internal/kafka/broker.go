package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/segmentio/kafka-go"
	"rajmines-vts/internal/ais140"
)

const (
	TopicRawTelemetry       = "gps-telemetry-raw"
	TopicProcessedTelemetry = "gps-telemetry-processed"
	TopicAlerts             = "vts-alerts-stream"
)

// Broker handles Kafka messaging with seamless in-memory pub-sub fallback
type Broker struct {
	brokers      []string
	isKafkaAlive bool
	writers      map[string]*kafka.Writer
	mu           sync.RWMutex
	// In-memory fallback channels
	subscribers map[string][]chan []byte
	subMu       sync.RWMutex
}

// NewBroker initializes connection to Kafka or falls back to internal memory broker
func NewBroker(brokerAddresses []string) *Broker {
	b := &Broker{
		brokers:     brokerAddresses,
		writers:     make(map[string]*kafka.Writer),
		subscribers: make(map[string][]chan []byte),
	}

	// Try probing Kafka broker with a 1.5-second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 1500*time.Millisecond)
	defer cancel()

	if len(brokerAddresses) > 0 {
		conn, err := kafka.DialContext(ctx, "tcp", brokerAddresses[0])
		if err == nil {
			conn.Close()
			b.isKafkaAlive = true
			log.Printf("[KAFKA] Connected successfully to Kafka cluster at %v", brokerAddresses)
		} else {
			log.Printf("[KAFKA] External Kafka broker at %v not reachable (%v). Using High-Throughput In-Memory Kafka Pipeline.", brokerAddresses, err)
		}
	} else {
		log.Printf("[KAFKA] No Kafka addresses provided. Initializing High-Throughput In-Memory Kafka Pipeline.")
	}

	return b
}

// Publish sends a message to the specified topic
func (b *Broker) Publish(topic string, key string, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// 1. If real Kafka is alive, write to Kafka Writer
	if b.isKafkaAlive {
		b.mu.Lock()
		writer, exists := b.writers[topic]
		if !exists {
			writer = &kafka.Writer{
				Addr:         kafka.TCP(b.brokers...),
				Topic:        topic,
				Balancer:     &kafka.LeastBytes{},
				BatchTimeout: 10 * time.Millisecond,
			}
			b.writers[topic] = writer
		}
		b.mu.Unlock()

		err := writer.WriteMessages(context.Background(), kafka.Message{
			Key:   []byte(key),
			Value: data,
			Time:  time.Now(),
		})
		if err != nil {
			log.Printf("[KAFKA WARN] Error publishing to Kafka topic %s: %v. Broadcasting to memory subscribers.", topic, err)
		}
	}

	// 2. Broadcast to in-memory subscribers (subscribers receive all messages immediately)
	b.subMu.RLock()
	subs, exists := b.subscribers[topic]
	b.subMu.RUnlock()

	if exists {
		for _, ch := range subs {
			select {
			case ch <- data:
			default:
				// Skip if buffer is full to prevent pipeline blocking
			}
		}
	}

	return nil
}

// Subscribe returns a channel that receives payloads for the given topic
func (b *Broker) Subscribe(topic string) <-chan []byte {
	ch := make(chan []byte, 1000)
	b.subMu.Lock()
	b.subscribers[topic] = append(b.subscribers[topic], ch)
	b.subMu.Unlock()
	return ch
}

// Close closes writers and subscribers
func (b *Broker) Close() {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, writer := range b.writers {
		writer.Close()
	}
}

// PublishRawAIS140 publishes raw string telemetry
func (b *Broker) PublishRawAIS140(rawString string) error {
	return b.Publish(TopicRawTelemetry, "RAW", map[string]interface{}{
		"raw":       rawString,
		"timestamp": time.Now().UTC(),
	})
}

// PublishTelemetryUpdate publishes a structured TelemetryUpdate
func (b *Broker) PublishTelemetryUpdate(update *ais140.TelemetryUpdate) error {
	return b.Publish(TopicProcessedTelemetry, update.IMEI, update)
}
