const RECONNECT_MS = 2000;

// Mỗi lần nối được gọi onOpen để gửi lại hồ sơ, vì server coi đó là người mới
export function connectGame({ onOpen, onMessage, onClose }) {
  let socket = null;

  function open() {
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${scheme}://${location.host}/game-ws`);
    socket.onopen = onOpen;
    socket.onmessage = (event) => onMessage(JSON.parse(event.data));
    socket.onclose = () => {
      onClose();
      setTimeout(open, RECONNECT_MS);
    };
  }

  open();
  return {
    send(message) {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    }
  };
}
