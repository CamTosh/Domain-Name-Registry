export function handleHello(socket: any) {
  socket.write(generateGreeting());
}
