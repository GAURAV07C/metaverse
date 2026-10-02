# AWS realtime scaling

The WebSocket client connects to:

```text
wss://<host>/ws?spaceId=<spaceId>
```

That query parameter is intentional. Mediasoup producers and consumers are local
to a single SFU process, so every user in the same space must reach the same
WebSocket/SFU instance unless router piping is implemented.

## Required env

```env
REDIS_URL="rediss://default:YOUR_UPSTASH_TOKEN@YOUR_UPSTASH_HOST:6379"
SFU_SPACE_AFFINITY="strict"
# Optional when each SFU has its own public websocket URL.
SFU_PUBLIC_URL="wss://metaver-sfu-1.example.com/ws"
MEDIASOUP_LISTEN_IP="0.0.0.0"
MEDIASOUP_ANNOUNCED_IP="YOUR_EC2_PUBLIC_IPV4_OR_ELASTIC_IP"
MEDIASOUP_RTC_MIN_PORT="40000"
MEDIASOUP_RTC_MAX_PORT="49999"
```

Open inbound UDP and TCP `40000-49999` to the WS/SFU instances.

## Nginx consistent routing example

Use this shape when you run multiple WS/SFU processes behind one reverse proxy:

```nginx
upstream metaverse_ws {
  hash $arg_spaceId consistent;
  server 127.0.0.1:3001;
  server 127.0.0.1:3002;
}

server {
  location /ws {
    proxy_pass http://metaverse_ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
  }
}
```

If the load balancer sends a space to the wrong SFU instance, the client will
receive `join-error` with reason `sfu-owned-by-other-instance`.

If `SFU_PUBLIC_URL` is set on each SFU instance, the owner registry stores it in
Redis and the browser can reconnect to the owning SFU automatically after that
join error.

Redis pub/sub shares signaling and presence between instances. It does not make
mediasoup producers consumable across SFU processes by itself.
