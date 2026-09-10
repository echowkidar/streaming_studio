import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { 
  Radio, Film, HardDrive, Users, 
  Play, Plus, Video, Calendar, ArrowRight
} from "lucide-react";

export default function DashboardHome() {
  const stats = [
    { label: "Broadcasts", value: "24", icon: Radio, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Recordings", value: "156", icon: Film, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Storage Used", value: "45.2 GB", icon: HardDrive, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Team Members", value: "8", icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Welcome back, Salar</h1>
          <p className="text-slate-400">{formatDate(new Date())}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary">
            <Plus className="w-4 h-4 mr-2" />
            New Studio
          </Button>
          <Button variant="primary">
            <Radio className="w-4 h-4 mr-2" />
            Go Live Now
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="glass rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content (2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Live Now */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Live Now
              </h2>
            </div>
            <div className="glass-strong rounded-2xl p-4 border border-white/10">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="w-full sm:w-48 aspect-video rounded-xl bg-surface overflow-hidden relative group">
                  <div className="absolute inset-0 bg-indigo-900/20 flex items-center justify-center">
                    <Video className="w-8 h-8 text-indigo-500/50" />
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">LIVE</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Product Launch Keynote</h3>
                  <p className="text-sm text-slate-400 mb-3">Started 45 mins ago • 1,204 viewers</p>
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm">Enter Studio</Button>
                    <Button variant="secondary" size="sm">View Stats</Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Recordings */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Recordings</h2>
              <Button variant="ghost" size="sm" className="text-indigo-400">View All <ArrowRight className="w-4 h-4 ml-1"/></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((item) => (
                <div key={item} className="glass rounded-xl overflow-hidden border border-white/5 group hover:border-white/20 transition-all cursor-pointer">
                  <div className="aspect-video bg-surface relative">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-4 h-4 text-white ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/60 text-white">45:20</div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium text-white mb-1 truncate">Weekly Q&A Session</h4>
                    <p className="text-xs text-slate-400">Recorded yesterday</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Content (1 col) */}
        <div className="space-y-8">
          
          {/* Upcoming */}
          <section className="glass rounded-2xl p-6 border border-white/5">
            <h2 className="text-lg font-semibold text-white mb-4">Upcoming</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-surface border border-white/5 shrink-0">
                  <span className="text-xs text-rose-400 font-semibold">TUE</span>
                  <span className="text-lg font-bold text-white leading-none">14</span>
                </div>
                <div>
                  <h4 className="font-medium text-white">Marketing Webinar</h4>
                  <p className="text-xs text-slate-400 mb-2">2:00 PM • YouTube, LinkedIn</p>
                  <Button variant="secondary" size="sm" className="w-full text-xs h-7">Enter Studio</Button>
                </div>
              </div>
              <div className="flex gap-4 items-start opacity-75">
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-surface border border-white/5 shrink-0">
                  <span className="text-xs text-indigo-400 font-semibold">THU</span>
                  <span className="text-lg font-bold text-white leading-none">16</span>
                </div>
                <div>
                  <h4 className="font-medium text-white">Guest Interview</h4>
                  <p className="text-xs text-slate-400 mb-2">10:00 AM • Twitch</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" className="w-full mt-4 text-sm text-slate-400">
              <Calendar className="w-4 h-4 mr-2" /> Open Calendar
            </Button>
          </section>

        </div>
      </div>

    </div>
  );
}
