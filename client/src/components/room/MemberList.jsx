export default function MemberList({ members = [], hostId }) {
  return (
    <div className="bg-charcoal border border-border rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/70">
        <h3 className="font-display text-sm text-cream font-medium flex items-center gap-2">
          <span>In the Room</span>
          <span className="text-[11px] px-2 py-0.2 bg-gold/15 text-gold rounded-full font-mono font-normal">
            {members.length}
          </span>
        </h3>
        <span className="text-[11px] text-muted flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-muted text-center py-4">Connecting to room...</p>
      ) : (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {members.map((member, idx) => {
            const isHost =
              (hostId && (member.userId === hostId || member.userId === hostId?._id)) ||
              idx === 0 // fallback
            return (
              <div
                key={member.userId || idx}
                className="flex items-center justify-between p-2 rounded-lg bg-obsidian/40 border border-border/40 hover:border-border transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-elevated border border-border flex items-center justify-center shrink-0 overflow-hidden text-xs font-semibold text-gold">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (member.username || 'U')[0].toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-cream truncate">
                        {member.username}
                      </p>
                      {isHost && (
                        <span className="text-[9px] uppercase px-1.5 py-0.2 bg-gold/20 text-gold rounded font-bold tracking-wider">
                          Host
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted">Listening in sync</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1">
                  <span className="w-1 h-2.5 bg-gold/70 rounded-full animate-pulse" />
                  <span className="w-1 h-3.5 bg-gold/90 rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-2 bg-gold/70 rounded-full animate-pulse delay-150" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
