# Expo Tunnel Setup Guide for External Device Testing

This guide covers how to set up an Expo tunnel to allow physical devices from outside your local network to connect and test your Expo app.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Method 1: Expo Tunnel (Recommended)](#method-1-expo-tunnel-recommended)
- [Method 2: Development Build with EAS](#method-2-development-build-with-eas)
- [Method 3: Manual Network Configuration](#method-3-manual-network-configuration)
- [Method 4: Using ngrok Directly](#method-4-using-ngrok-directly)
- [Troubleshooting](#troubleshooting)
- [Connection URLs](#connection-urls)

## Overview

When developing with Expo, you typically run your app locally and test it on devices within your local network. However, to test with devices outside your network (e.g., testing with clients, remote team members, or devices on different networks), you need to create a tunnel that makes your local development server accessible over the internet.

## Prerequisites

- Expo CLI installed: `npm install -g @expo/cli`
- ngrok package for tunnels: `npm install @expo/ngrok@^4.1.0`
- Your Expo project running locally
- Physical devices with Expo Go or development builds installed

## Method 1: Expo Tunnel (Recommended)

The easiest and most reliable method for external device testing.

### Setup Steps

1. **Install ngrok package (if not already installed):**
   ```bash
   npm install @expo/ngrok@^4.1.0
   ```

2. **Start Expo with tunnel:**
   ```bash
   # For Expo Go
   npx expo start --tunnel --go
   
   # For Development Build
   npx expo start --tunnel --dev-client
   
   # For general use
   npx expo start --tunnel
   ```

3. **Wait for tunnel initialization:**
   - The tunnel will take 10-30 seconds to establish
   - You'll see "Tunnel connected" and "Tunnel ready" messages
   - A QR code will be displayed in the terminal

### Connection Information

Once the tunnel is active, you'll get:

- **HTTPS Tunnel URL:** `https://[random-id]-anonymous-8081.exp.direct`
- **Expo Go URL:** `exp://[random-id]-anonymous-8081.exp.direct:443`
- **Development Build URL:** `exp+[project-name]://expo-development-client/?url=https%3A%2F%2F[random-id]-anonymous-8081.exp.direct`

### How to Connect

1. **Using Expo Go:**
   - Install Expo Go from App Store/Google Play
   - Open Expo Go
   - Tap "Enter URL manually"
   - Enter the Expo Go URL

2. **Using QR Code:**
   - Scan the QR code displayed in your terminal
   - Use your device's camera or Expo Go's QR scanner

3. **Using Development Build:**
   - Open your development build app
   - Use the development build URL or scan the QR code

## Method 2: Development Build with EAS

For more advanced testing with custom native code.

### Setup Steps

1. **Create a development build:**
   ```bash
   eas build --profile development --platform all
   ```

2. **Install the development build on your device**

3. **Start the development server:**
   ```bash
   npx expo start --tunnel --dev-client
   ```

4. **Connect using the development build URL**

## Method 3: Manual Network Configuration

For advanced users who want more control over the network setup.

### Setup Steps

1. **Find your computer's IP address:**
   ```bash
   # macOS/Linux
   ifconfig
   
   # Windows
   ipconfig
   ```

2. **Configure router port forwarding:**
   - Forward port 8081 (Metro bundler) to your computer's IP
   - Forward port 19000 (Expo dev server) to your computer's IP
   - Forward port 19001 (Expo dev tools) to your computer's IP

3. **Start Expo with host configuration:**
   ```bash
   npx expo start --host YOUR_COMPUTER_IP
   # or
   npx expo start --host 0.0.0.0
   ```

4. **Access from external devices:**
   - Use your public IP address
   - External devices can connect using: `exp://YOUR_PUBLIC_IP:19000`

## Method 4: Using ngrok Directly

For users who want more control over the tunnel configuration.

### Setup Steps

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start your Expo server normally:**
   ```bash
   npx expo start
   ```

3. **Create a tunnel in another terminal:**
   ```bash
   ngrok http 19000
   ```

4. **Use the ngrok URL to connect**

## Troubleshooting

### Common Issues

1. **"Network connection was lost" error:**
   - **Cause:** Wrong tunnel mode (Expo Go vs Development Build)
   - **Solution:** Use `--go` flag for Expo Go or `--dev-client` for development builds

2. **Tunnel not connecting:**
   - **Cause:** Missing ngrok package
   - **Solution:** Install `@expo/ngrok@^4.1.0`

3. **QR code not displaying:**
   - **Cause:** Terminal display issues
   - **Solution:** Use manual URL entry or generate QR code separately

4. **Slow connection:**
   - **Cause:** Tunnel server location or network issues
   - **Solution:** Try different tunnel types or restart the tunnel

### Debugging Commands

```bash
# Check if tunnel is running
curl -s http://localhost:4040/api/tunnels

# Test tunnel connectivity
curl -s https://[tunnel-url]/status

# Check Metro bundler status
curl -s http://localhost:8081/status

# View tunnel logs
curl -s http://localhost:4040/api/tunnels | python3 -m json.tool
```

## Connection URLs

### Current Project URLs

**Tunnel Status:** ✅ Active  
**Metro Bundler:** ✅ Running  
**HTTPS Tunnel:** `https://vayaxte-anonymous-8081.exp.direct`

### For Expo Go
```
exp://vayaxte-anonymous-8081.exp.direct:443
```

### For Development Build
```
exp+betame://expo-development-client/?url=https%3A%2F%2Fvayaxte-anonymous-8081.exp.direct
```

### QR Code Generation

To generate a QR code for easy connection:

```bash
# Install qrencode
brew install qrencode

# Generate QR code for Expo Go
echo "exp://vayaxte-anonymous-8081.exp.direct:443" | qrencode -t PNG -o expo_go_qr.png

# Generate QR code for Development Build
echo "exp+betame://expo-development-client/?url=https%3A%2F%2Fvayaxte-anonymous-8081.exp.direct" | qrencode -t PNG -o dev_build_qr.png
```

## Best Practices

1. **Use the appropriate tunnel mode:**
   - `--go` for Expo Go testing
   - `--dev-client` for development build testing

2. **Keep the tunnel active:**
   - Don't close the terminal running the tunnel
   - The tunnel will remain active as long as the development server is running

3. **Monitor tunnel status:**
   - Check the tunnel URL regularly
   - Restart if connection issues occur

4. **Security considerations:**
   - Tunnels are temporary and secure
   - Don't share tunnel URLs publicly
   - Use development builds for sensitive testing

## Quick Reference Commands

```bash
# Start tunnel for Expo Go
npx expo start --tunnel --go

# Start tunnel for Development Build
npx expo start --tunnel --dev-client

# Start tunnel with cache clear
npx expo start --tunnel --clear

# Stop all Expo processes
pkill -f "expo start"

# Check tunnel status
curl -s http://localhost:4040/api/tunnels
```

## Notes

- Tunnel URLs are temporary and change each time you restart the tunnel
- The tunnel will automatically handle SSL certificates
- External devices need internet access to connect
- Code changes will automatically reload on connected devices
- The tunnel works through firewalls and NAT

---

**Last Updated:** August 23, 2025  
**Project:** BetaMe App  
**Status:** ✅ Tunnel Active and Ready for External Testing
