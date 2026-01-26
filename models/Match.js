import mongoose from "mongoose";

const ballSchema = new mongoose.Schema({
    over: Number,
    ballNumber: Number,
    batsman: String,
    bowler: String,
    runs: Number,
    extras: Number,
    isWicket: Boolean,
    wicketType: String,
    dismissedPlayer: String,
    inning: String, // 'A' or 'B'
    timestamp: { type: Date, default: Date.now }
});

const matchSchema = new mongoose.Schema({
    matchId: { type: String, required: true, unique: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    eligiblePlayers: [String],

    // Global Settings
    maxOvers: { type: Number, default: 5 }, // Default 5 (Gully Cricket style)
    currentInnings: { type: String, default: "A" }, // 'A' or 'B'
    target: { type: Number, default: null },
    
    matchStatus: { type: String, enum: ['live', 'completed', 'tie'], default: 'live' },
    winner: { type: String, default: null },
    winMargin: String, // e.g., "Won by 10 runs" or "Won by 4 wickets"

    // Current Activity
    striker: { type: String, default: null },
    nonStriker: { type: String, default: null },
    bowler: { type: String, default: null },

    // Team Data
    teamA: {
        name: { type: String, default: "Team A" },
        players: [String],
        score: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs: { type: Number, default: 0 },
        balls: { type: Number, default: 0 }
    },
    teamB: {
        name: { type: String, default: "Team B" },
        players: [String],
        score: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs: { type: Number, default: 0 },
        balls: { type: Number, default: 0 }
    },

    // Detailed Stats (Map allows looking up by player name easily)
    batsmen: mongoose.Schema.Types.Mixed,
    bowlers: mongoose.Schema.Types.Mixed,

    ballHistory: [ballSchema],
    currentOverHistory: [String] 
}, { timestamps: true });

export default mongoose.model("Match", matchSchema);