import { useState, useRef, useEffect } from 'react'
import socketService from '../../services/socketService'

export default function RoomChat({
  messages = [],
  currentUserId,
}) {
  const [text, setText] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    socketService.sendMessage(text.trim())
    setText('')
  }

  return (
    <div className="bg-charcoal border border-border rounded-xl p-5 shadow-lg flex flex-col h-full min-h-[360px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-border/70">
        <div>
          <h3 className="font-display text-sm text-cream font-medium">Room Chat</h3>
          <p className="text-[11px] text-muted">Quiet chatter among listeners</p>
        </div>
        <span className="text-[10px] text-muted/60">Secondary to music</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-72 mb-3"
      >
        {messages.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted/60">
            No words yet. Drop a thought about the current track.
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe =
              msg.senderId === currentUserId || msg.sender === currentUserId
            const time = msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''

            return (
              <div
                key={msg._id || index}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-muted">
                  <span className="font-medium text-cream/80">
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span>{time}</span>
                </div>
                <div
                  className={[
                    'px-3 py-2 rounded-lg text-xs max-w-[85%] break-words',
                    isMe
                      ? 'bg-gold/20 text-cream border border-gold/30 rounded-tr-none'
                      : 'bg-obsidian text-cream border border-border/70 rounded-tl-none',
                  ].join(' ')}
                >
                  {msg.text}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Message input */}
      <form onSubmit={handleSend} className="mt-auto flex gap-2">
        <input
          type="text"
          placeholder="Say something to the room..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          className="flex-1 bg-obsidian border border-border rounded-md px-3 py-2 text-xs text-cream focus:outline-none focus:border-gold/70"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-3.5 py-2 bg-gold text-obsidian rounded-md text-xs font-medium hover:bg-gold/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}
