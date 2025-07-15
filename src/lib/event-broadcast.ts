// Store active connections
const activeConnections = new Set<ReadableStreamDefaultController>();

// Function to broadcast events to all connected clients
export function broadcastEvent(event: any) {
  const eventData = `data: ${JSON.stringify(event)}\n\n`;
  
  // Send to all active connections
  activeConnections.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(eventData));
    } catch (error) {
      // Connection closed, remove it
      activeConnections.delete(controller);
    }
  });
}

// Function to add a connection to the active set
export function addConnection(controller: ReadableStreamDefaultController) {
  activeConnections.add(controller);
}

// Function to remove a connection from the active set
export function removeConnection(controller: ReadableStreamDefaultController) {
  activeConnections.delete(controller);
}

// Function to get the count of active connections
export function getActiveConnectionCount(): number {
  return activeConnections.size;
} 