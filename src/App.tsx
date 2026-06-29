/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowUpRight, 
  Play, 
  Clock, 
  Globe, 
  CheckSquare, 
  Zap, 
  Trophy,
  Plus,
  RotateCcw,
  CheckCircle2,
  Lock,
  User
} from "lucide-react";
import FadingVideo from "./components/FadingVideo";
import BlurText from "./components/BlurText";

// Structure of tasks inside local state to match the Python schemas
interface Task {
  id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  status: "pending" | "completed";
}

export default function App() {
  // Gamified User State (mirrors SQLAlchemy / SQLite state)
  const [username, setUsername] = useState<string>("AthleteOne");
  const [totalXp, setTotalXp] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Task form state
  const [newTitle, setNewTitle] = useState<string>("");
  const [newDifficulty, setNewDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");

  // Load initial state or seed default database state (matching seed_database in main.py)
  useEffect(() => {
    const savedUser = localStorage.getItem("fitquest_user");
    const savedTasks = localStorage.getItem("fitquest_tasks");

    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUsername(parsed.username || "AthleteOne");
      setTotalXp(parsed.total_xp || 0);
      setLevel(parsed.level || 1);
    } else {
      // Seed default user
      localStorage.setItem("fitquest_user", JSON.stringify({ username: "AthleteOne", total_xp: 0, level: 1 }));
    }

    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    } else {
      // Seed default tasks (matching standard python backend tasks)
      const defaultTasks: Task[] = [
        { id: 1, title: "50x Diamond Pushups", difficulty: "Medium", status: "pending" },
        { id: 2, title: "5km Morning Sprint", difficulty: "Hard", status: "pending" },
        { id: 3, title: "10-minute Plank Hold", difficulty: "Easy", status: "pending" }
      ];
      setTasks(defaultTasks);
      localStorage.setItem("fitquest_tasks", JSON.stringify(defaultTasks));
    }
  }, []);

  // Sync state helper that behaves exactly like SQL database transactions
  const saveState = (updatedUser: { username: string; total_xp: number; level: number }, updatedTasks: Task[]) => {
    localStorage.setItem("fitquest_user", JSON.stringify(updatedUser));
    localStorage.setItem("fitquest_tasks", JSON.stringify(updatedTasks));
    setTotalXp(updatedUser.total_xp);
    setLevel(updatedUser.level);
    setTasks(updatedTasks);
  };

  // Smooth scroll handler
  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // POST /api/tasks (Create a task)
  const handleCreateTask = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: Date.now(),
      title: newTitle.trim(),
      difficulty: newDifficulty,
      status: "pending"
    };

    const updatedTasks = [...tasks, newTask];
    saveState({ username, total_xp: totalXp, level }, updatedTasks);

    setNewTitle("");
  };

  // POST /api/tasks/{id}/complete (Mark task completed and add XP)
  const handleCompleteTask = (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (task.status === "completed") {
      return;
    }

    // XP calculation map matching main.py math logic
    const xpMap = { Easy: 10, Medium: 20, Hard: 50 };
    const xpGained = xpMap[task.difficulty];
    
    const newXp = totalXp + xpGained;
    const newLevel = Math.floor(newXp / 100) + 1;

    const updatedTasks = tasks.map(t => t.id === id ? { ...t, status: "completed" as const } : t);
    const updatedUser = { username, total_xp: newXp, level: newLevel };

    saveState(updatedUser, updatedTasks);
  };

  // Database Reset helper
  const handleResetDatabase = () => {
    const defaultTasks: Task[] = [
      { id: 1, title: "50x Diamond Pushups", difficulty: "Medium", status: "pending" },
      { id: 2, title: "5km Morning Sprint", difficulty: "Hard", status: "pending" },
      { id: 3, title: "10-minute Plank Hold", difficulty: "Easy", status: "pending" }
    ];
    const defaultUser = { username: "AthleteOne", total_xp: 0, level: 1 };
    saveState(defaultUser, defaultTasks);
  };

  // Calculate current level progression percentage
  const levelProgressPercent = totalXp % 100;

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-white selection:text-black">
      
      {/* Navbar - Fixed floating at top */}
      <nav className="fixed top-4 left-0 right-0 z-50 px-4 md:px-8 lg:px-16" id="navbar">
        <div className="max-w-7xl mx-auto flex items-center justify-between w-full h-16">
          {/* Left: 48x48 liquid-glass circle with italic serif lowercase "f" */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-12 h-12 rounded-full flex items-center justify-center liquid-glass font-heading text-3xl italic font-normal text-white select-none cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            f
          </motion.div>
          
          {/* Center: liquid-glass pill holding 5 text links (desktop only) */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full liquid-glass"
          >
            {[
              { label: "Dashboard", target: "hero" },
              { label: "Quests", target: "arena" },
              { label: "Leaderboard", target: "features" },
              { label: "Rewards", target: "arena" },
              { label: "Profile", target: "arena" }
            ].map((link, idx) => (
              <button
                key={`${link.label}-${idx}`}
                onClick={() => handleScrollToSection(link.target)}
                className="px-5 py-2 text-xs uppercase tracking-widest text-white/60 hover:text-white rounded-full transition-all duration-300 font-medium font-body cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </motion.div>

          {/* Right: white pill button "Start Quest" + ArrowUpRight icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <button 
              onClick={() => handleScrollToSection("arena")}
              className="px-6 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-white/95 active:scale-95 transition-all duration-300 flex items-center gap-2 text-sm select-none cursor-pointer shadow-lg shadow-white/5 font-body"
            >
              Start Quest
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </nav>

      {/* SECTION 1 — HERO (full viewport, black bg) */}
      <section 
        className="relative w-full min-h-screen overflow-hidden bg-black flex flex-col items-center justify-between"
        id="hero"
      >
        {/* Background Video (120% width/height, top-aligned, centered horizontally) */}
        <FadingVideo 
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4"
          className="absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top z-0"
          style={{ width: "120%", height: "120%" }}
        />

        {/* Content Container (z-10 layer) */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-32 md:pt-40 flex flex-col items-center justify-center text-center flex-grow">
          
          {/* Badge (delay 0.4s) */}
          <motion.div
            initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="inline-flex items-center gap-2.5 p-1 pr-4 rounded-full liquid-glass max-w-max mx-auto mb-6 text-xs md:text-sm"
          >
            <span className="bg-white text-black text-[10px] md:text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest select-none">
              Season 1
            </span>
            <span className="text-white/80 font-medium tracking-wide font-body select-none">
              The Awakening Event is Live
            </span>
          </motion.div>

          {/* Headline - BlurText component */}
          <BlurText 
            text="Level Up Your Body Forge Your Legacy"
            className="text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic text-white leading-[0.8] max-w-2xl justify-center tracking-[-4px]"
            delay={0.5}
          />

          {/* Subheading (delay 0.8s) */}
          <motion.p
            initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
            className="text-sm md:text-base text-white/70 max-w-xl mx-auto mt-8 font-light leading-relaxed font-body select-none"
          >
            Turn your daily workouts into an epic RPG adventure. Complete physical tasks, earn XP, and become the ultimate athlete in our gamified fitness ecosystem.
          </motion.p>

          {/* CTAs (delay 1.1s) */}
          <motion.div
            initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
          >
            {/* Primary liquid-glass-strong */}
            <button 
              onClick={() => handleScrollToSection("arena")}
              className="px-8 py-4 liquid-glass-strong rounded-full text-white font-medium hover:bg-white/5 active:scale-95 transition-all duration-300 flex items-center gap-2 group cursor-pointer text-sm font-body tracking-wider uppercase"
            >
              Enter The Arena
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300 text-white" />
            </button>

            {/* Secondary bare text link */}
            <button 
              onClick={() => handleScrollToSection("features")}
              className="px-6 py-3 text-white/80 hover:text-white transition-colors duration-300 flex items-center gap-2 cursor-pointer text-sm font-medium font-body tracking-wide"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center liquid-glass">
                <Play className="w-3 h-3 fill-white text-white translate-x-0.5" />
              </div>
              View Gameplay
            </button>
          </motion.div>

          {/* Stats row (delay 1.3s) */}
          <motion.div
            initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3, ease: "easeOut" }}
            className="flex flex-wrap items-center justify-center gap-6 mt-16 max-w-3xl mx-auto mb-12"
          >
            {/* Card 1 */}
            <div className="w-[220px] p-6 rounded-[1.25rem] liquid-glass flex flex-col items-start text-left border border-white/5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 mb-4 border border-white/10">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="text-4xl font-heading italic text-white font-normal leading-none select-none">
                1M+
              </div>
              <div className="text-[10px] text-white/50 uppercase tracking-widest mt-2.5 font-semibold font-body select-none">
                Daily Quests Cleared
              </div>
            </div>

            {/* Card 2 */}
            <div className="w-[220px] p-6 rounded-[1.25rem] liquid-glass flex flex-col items-start text-left border border-white/5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 mb-4 border border-white/10">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="text-4xl font-heading italic text-white font-normal leading-none select-none">
                Lv. 99
              </div>
              <div className="text-[10px] text-white/50 uppercase tracking-widest mt-2.5 font-semibold font-body select-none">
                Max Level Cap Reached
              </div>
            </div>
          </motion.div>

        </div>

        {/* Partners (bottom of hero, delay 1.4s) */}
        <motion.div
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4, ease: "easeOut" }}
          className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-12 flex flex-col items-center gap-4 text-center"
        >
          <div className="px-4 py-1.5 rounded-full liquid-glass text-[10px] uppercase tracking-widest text-white/40 font-semibold font-body">
            Integrated with top fitness protocols
          </div>
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3 font-heading italic text-2xl text-white/60 select-none">
            <span>Strava</span>
            <span className="text-white/20 text-lg select-none">·</span>
            <span>Nike</span>
            <span className="text-white/20 text-lg select-none">·</span>
            <span>Garmin</span>
            <span className="text-white/20 text-lg select-none">·</span>
            <span>Discord</span>
            <span className="text-white/20 text-lg select-none">·</span>
            <span>Twitch</span>
          </div>
        </motion.div>

      </section>

      {/* SECTION 2 — FEATURES (min-h-screen, black bg) */}
      <section 
        className="relative w-full min-h-screen overflow-hidden bg-black py-24 md:py-32 flex flex-col justify-center items-center"
        id="features"
      >
        {/* Background Video (full-bleed) */}
        <FadingVideo 
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Features Content Container (relative z-10) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16 flex flex-col text-left"
        >

          {/* Heading: font-heading italic text-white text-6xl */}
          <h2 className="font-heading italic text-white text-5xl md:text-6xl lg:text-7xl leading-[0.9] select-none tracking-tight">
            Fitness<br/>evolved
          </h2>

          {/* Three cards (grid md:grid-cols-3 gap-6 mt-16) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 md:mt-16 w-full">
            
            {/* Card 1 (Daily Quests) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="liquid-glass rounded-[1.25rem] p-6 md:p-8 flex flex-col justify-between border border-white/5 group hover:border-white/10 transition-all duration-500"
            >
              <div>
                {/* Icon CheckSquare */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 mb-6 group-hover:bg-white/10 transition-colors duration-300">
                  <CheckSquare className="w-6 h-6 text-white" />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6 select-none">
                  {["Custom Workouts", "Auto-Reset", "Difficulty Scaling"].map((tag, idx) => (
                    <span 
                      key={`tag1-${idx}`}
                      className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase tracking-wider text-white/60 font-medium font-body"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-white tracking-wide font-body mb-3">
                  Daily Quests
                </h3>

                {/* Body */}
                <p className="text-sm text-white/65 leading-relaxed font-body">
                  Input your exercises as quests. From 50x push-ups to a 5km run, set your difficulty and conquer your to-do list.
                </p>
              </div>
            </motion.div>

            {/* Card 2 (XP System) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="liquid-glass rounded-[1.25rem] p-6 md:p-8 flex flex-col justify-between border border-white/5 group hover:border-white/10 transition-all duration-500"
            >
              <div>
                {/* Icon Zap */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 mb-6 group-hover:bg-white/10 transition-colors duration-300">
                  <Zap className="w-6 h-6 text-white" />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6 select-none">
                  {["Level Up", "Skill Trees", "Instant Rewards"].map((tag, idx) => (
                    <span 
                      key={`tag2-${idx}`}
                      className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase tracking-wider text-white/60 font-medium font-body"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-white tracking-wide font-body mb-3">
                  XP & Progression
                </h3>

                {/* Body */}
                <p className="text-sm text-white/65 leading-relaxed font-body">
                  Earn points for every drop of sweat. Watch your character level up in real-time as you crush your physical limits.
                </p>
              </div>
            </motion.div>

            {/* Card 3 (Leaderboards) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="liquid-glass rounded-[1.25rem] p-6 md:p-8 flex flex-col justify-between border border-white/5 group hover:border-white/10 transition-all duration-500"
            >
              <div>
                {/* Icon Trophy */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 mb-6 group-hover:bg-white/10 transition-colors duration-300">
                  <Trophy className="w-6 h-6 text-white" />
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-6 select-none">
                  {["Global Ranking", "Daily Streaks", "Badges"].map((tag, idx) => (
                    <span 
                      key={`tag3-${idx}`}
                      className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase tracking-wider text-white/60 font-medium font-body"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-white tracking-wide font-body mb-3">
                  Global Arena
                </h3>

                {/* Body */}
                <p className="text-sm text-white/65 leading-relaxed font-body">
                  Compete with athletes worldwide. Keep your daily login streak alive to earn multiplier bonuses and exclusive titles.
                </p>
              </div>
            </motion.div>

          </div>

        </motion.div>

      </section>

      {/* SECTION 3 — THE ARENA (Interactive Dashboard & API Playground) */}
      <section 
        className="relative w-full min-h-screen bg-black py-24 border-t border-white/10 flex flex-col items-center justify-start"
        id="arena"
      >
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16 relative z-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="font-heading italic text-white text-5xl md:text-6xl leading-[0.9] select-none tracking-tight">
                The Arena
              </h2>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-4">
              <button 
                onClick={handleResetDatabase}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                title="Reset Quest State"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* COLUMN 1: Profile & Progress Stats (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Profile Card */}
              <div className="liquid-glass rounded-3xl p-6 border border-white/5">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold tracking-wide font-body text-white leading-tight">
                      {username}
                    </h4>
                    <span className="text-xs uppercase tracking-widest text-white/40 font-semibold font-body">
                      Elite Level Recruit
                    </span>
                  </div>
                </div>

                {/* Level Display */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between mb-6">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-white/40 font-semibold font-body">Current Level</span>
                    <h5 className="text-3xl font-heading italic text-white leading-none mt-1 select-none">Level {level}</h5>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-bold text-lg select-none">
                    Lvl {level}
                  </div>
                </div>

                {/* XP Progression Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono uppercase text-white/50 mb-2">
                    <span>XP Progression</span>
                    <span>{levelProgressPercent} / 100 XP</span>
                  </div>
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <motion.div 
                      className="h-full bg-white rounded-full shadow-lg shadow-white/10"
                      initial={{ width: 0 }}
                      animate={{ width: `${levelProgressPercent}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/30 font-mono mt-2">
                    <span>Total Accumulated: {totalXp} XP</span>
                    <span>Next Level in {100 - levelProgressPercent} XP</span>
                  </div>
                </div>

              </div>

            </div>

            {/* COLUMN 2: Tasks & Form List (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* Add New Quest Form */}
              <div className="liquid-glass rounded-3xl p-6 border border-white/5">
                <h3 className="text-lg font-semibold text-white tracking-wide font-body mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-white" /> Create Workout Quest
                </h3>
                
                <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-white/40 tracking-widest mb-1.5">
                      Workout Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 50x Heavy Pushups"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      maxLength={100}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all font-body"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-white/40 tracking-widest mb-1.5">
                      Difficulty Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Easy", "Medium", "Hard"] as const).map((dif) => (
                        <button
                          key={dif}
                          type="button"
                          onClick={() => setNewDifficulty(dif)}
                          className={`py-2 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                            newDifficulty === dif
                              ? "bg-white text-black border-white"
                              : "bg-white/5 text-white/55 border-white/10 hover:border-white/20"
                          }`}
                        >
                          {dif}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-3 bg-white text-black font-semibold rounded-xl text-xs uppercase tracking-widest hover:bg-white/95 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 font-body"
                  >
                    Deploy Quest to DB
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Interactive Quest Tasks List */}
              <div className="liquid-glass rounded-3xl p-6 border border-white/5 flex-grow">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white tracking-wide font-body">
                    Active Quests
                  </h3>
                  <span className="text-[10px] font-mono text-white/40 uppercase">
                    {tasks.filter(t => t.status === "pending").length} Pending
                  </span>
                </div>

                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {tasks.map((task) => {
                      const isCompleted = task.status === "completed";
                      const diffColors = {
                        Easy: { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", xp: "+10 XP" },
                        Medium: { bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", xp: "+20 XP" },
                        Hard: { bg: "bg-rose-500/10 text-rose-400 border-rose-500/20", xp: "+50 XP" }
                      };
                      const diffInfo = diffColors[task.difficulty];

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                            isCompleted 
                              ? "bg-white/2 border-white/5 opacity-40" 
                              : "bg-white/5 border-white/10 hover:border-white/25"
                          }`}
                        >
                          <div className="flex items-center gap-3.5 pr-2">
                            {/* Complete trigger checkbox button */}
                            <button
                              disabled={isCompleted}
                              onClick={() => handleCompleteTask(task.id)}
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                isCompleted
                                  ? "bg-white border-white text-black cursor-default"
                                  : "border-white/30 hover:border-white bg-white/5 text-transparent hover:text-white/40 cursor-pointer"
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>

                            <div className="text-left">
                              <p className={`text-sm font-medium font-body tracking-wide leading-snug ${isCompleted ? "line-through text-white/30" : "text-white"}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${diffInfo.bg}`}>
                                  {task.difficulty}
                                </span>
                                <span className="text-[9px] font-mono text-white/30">
                                  {diffInfo.xp}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Complete status or Lock symbol */}
                          <div>
                            {isCompleted ? (
                              <span className="text-[10px] font-mono uppercase text-white/30 tracking-wider">
                                Claimed
                              </span>
                            ) : (
                              <button
                                onClick={() => handleCompleteTask(task.id)}
                                className="px-3 py-1 bg-white/10 hover:bg-white text-white hover:text-black rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* Subtle bottom glass footer */}
      <footer className="relative z-10 w-full bg-black py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left select-none">
          <div className="text-xs text-white/30 font-body">
            © 2026 FITQUEST. ALL RIGHTS RESERVED. UNLEASH YOUR POTENTIAL.
          </div>
          <div className="flex items-center gap-6 text-xs text-white/40">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
