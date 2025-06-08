#!/bin/bash

echo "🎹 Testing Live Piano Audio in Browser"
echo "Make sure the browser is open at http://localhost:3001"
echo "You should hear piano notes playing in the browser!"
echo ""

# Function to send a single command to MCP server
send_note() {
    local note=$1
    local velocity=$2
    local duration=$3
    local description=$4
    
    echo "🎵 $description"
    echo -e "play $note $velocity $duration\nquit" | timeout 10s node dist/test-client.js dist/simple-piano-mcp.js > /dev/null 2>&1
    sleep 1
}

# Test individual notes
echo "🎼 Playing individual notes..."
send_note "C4" 100 2000 "Playing C4 (Middle C) for 2 seconds"
send_note "E4" 100 2000 "Playing E4 for 2 seconds"  
send_note "G4" 100 2000 "Playing G4 for 2 seconds"
send_note "C5" 100 3000 "Playing C5 (High C) for 3 seconds"

echo ""
echo "🎵 Playing a C major chord..."
# Play chord (notes will overlap)
echo -e "play C4 80 3000\nplay E4 80 3000\nplay G4 80 3000\nquit" | timeout 10s node dist/test-client.js dist/simple-piano-mcp.js > /dev/null 2>&1
sleep 4

echo ""
echo "🎼 Playing Twinkle Twinkle Little Star melody..."
# Play melody
notes=("C4" "C4" "G4" "G4" "A4" "A4" "G4" "F4" "F4" "E4" "E4" "D4" "D4" "C4")
for note in "${notes[@]}"; do
    send_note "$note" 80 600 "♪ $note"
    sleep 0.1
done

echo ""
echo "✅ Live piano audio test complete!"
echo "If you heard piano notes in the browser, the system is working correctly!" 