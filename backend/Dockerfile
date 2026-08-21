FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /rajmines-server ./cmd/server/main.go

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /rajmines-server /app/rajmines-server

EXPOSE 8080
CMD ["/app/rajmines-server"]
