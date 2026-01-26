import Match from "../models/Match.js";
import Settlement from "../models/Settlement.js";
import Group from "../models/Group.js";

 
export default function setupCricketSocket(io) {

    
    io.on("connection", (socket) => {
        console.log(` Socket Connected: ${socket.id}`);

        // --- 1. JOIN MATCH ---
        socket.on("joinMatch", async ({ matchId }) => {
            if (!matchId) {
            socket.emit("error", { message: "Match ID is required" });
            return;
            }

            const match = await Match.findOne({ matchId });
            if (!match) {
            socket.emit("error", { message: "Match not found" });
            return;
            }

            socket.join(matchId);
            socket.emit("updateMatch", match);
        });
        // --- 2. ADD PLAYERS (Manual Setup) ---
    socket.on("addPlayer", async ({ matchId, playerName, team }) => {
            try {
                const match = await Match.findOne({ matchId });
                if (!match || match.matchStatus === 'completed') return;

                const targetTeam = team === "A" ? match.teamA : match.teamB;
                const otherTeam = team === "A" ? match.teamB : match.teamA;

                if (targetTeam.players.includes(playerName) || otherTeam.players.includes(playerName)) {
                    socket.emit("error", { message: "Player already in a team" });
                    return;
                }

                targetTeam.players.push(playerName);
                
               
                if (!match.batsmen) match.batsmen = {};
                if (!match.bowlers) match.bowlers = {};

                match.batsmen[playerName] = { 
                    team, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false 
                };

                match.bowlers[playerName] = { 
                    team, overs: 0, balls: 0, runs: 0, wickets: 0, economy: 0 
                };

                // ✅ IMPORTANT: Tell Mongoose the Mixed types changed
                match.markModified('batsmen');
                match.markModified('bowlers');

                await match.save();
                io.to(matchId).emit("updateMatch", match);
            } catch (err) { 
                console.log("Add Player Error:", err); 
            }
        });
        // --- 3. SET CURRENT PLAYERS ---
        socket.on("setCurrentPlayers", async ({ matchId, striker, nonStriker, bowler }) => {
            const match = await Match.findOne({ matchId });
            console.log("striker is ",striker);
            console.log("nonstriker is ",nonStriker);
            
            
            console.log("match batsman",match.batsmen[striker]);
            console.log("match nonstriker",match.batsmen[striker]?.isOut);
            
            if (match && match.matchStatus !== 'completed') {
               //whose wicket done  can't play again
                if(striker && match.batsmen[striker] && match.batsmen[striker].isOut){
                    io.to(matchId).emit("notification", { message: `${striker} is out and cannot bat again!`, type: "error" });
                    striker=null;
                    //send notification cannot playa again
                    
                }
                if(striker) match.striker = striker;
                if(nonStriker && match.batsmen[nonStriker] && match.batsmen[nonStriker].isOut){
                     io.to(matchId).emit("notification", { message: `${nonStriker} is out and cannot bat again!`, type: "error" });
                    nonStriker=null;
                    //send notification cannot playa again
                }
                if(nonStriker) match.nonStriker = nonStriker;

                if (bowler) match.bowler = bowler;
                await match.save();
                console.log("set current player match",match);
                
                io.to(matchId).emit("updateMatch", match);
            }
        });

        // --- 4. SET MAX OVERS (Gully Cricket Feature) ---
        socket.on("setMaxOvers", async ({ matchId, overs }) => {
            const match = await Match.findOne({ matchId });
            if (match) {
                match.maxOvers = parseInt(overs);
                await match.save();
                io.to(matchId).emit("updateMatch", match);
                io.to(matchId).emit("notification", { message: `Max overs set to ${overs}` });
            }
        });

        // --- 5. RECORD A BALL ---
        socket.on("recordBall", async ({ matchId, ballData }) => {
            try {
                const match = await Match.findOne({ matchId });
                if (!match || match.matchStatus === 'completed') return;

                // --- 1. SETUP TEAMS ---
                const isInningA = match.currentInnings === "A";
                const battingTeam = isInningA ? match.teamA : match.teamB;
                const bowlingTeam = isInningA ? match.teamB : match.teamA;

                let runs = parseInt(ballData.runs) || 0;
                let extra = 0;
                let legalBall = true;

                // --- 2. CALCULATE RUNS & EXTRAS ---
                if (ballData.isWide || ballData.isNoBall) {
                    extra = 1;
                    legalBall = false;
                }

                battingTeam.score += runs + extra;

                if (legalBall) {
                    battingTeam.balls++;
                    const completed = Math.floor(battingTeam.balls / 6);
                    const rem = battingTeam.balls % 6;
                    battingTeam.overs = parseFloat(`${completed}.${rem}`);
                }

                // --- 3. UPDATE BATSMAN STATS ---
                // Initialize Striker if missing in stats
                if (match.striker && !match.batsmen[match.striker]) {
                     match.batsmen[match.striker] = { team: battingTeam.name, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false };
                }

                if (match.striker && legalBall && !ballData.isWide) {
                    const bat = match.batsmen[match.striker];
                    bat.runs += runs;
                    bat.balls += 1;
                    if (runs === 4) bat.fours++;
                    if (runs === 6) bat.sixes++;
                    bat.strikeRate = bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(2) : 0;
                    // No need to set back, just markModified later
                }

                // --- 4. UPDATE BOWLER STATS ---
                if (match.bowler) {
                    if (!match.bowlers[match.bowler]) {
                        match.bowlers[match.bowler] = { team: bowlingTeam.name, overs: 0, balls: 0, runs: 0, wickets: 0, economy: 0 };
                    }

                    const bowl = match.bowlers[match.bowler];
                    bowl.runs += runs + extra;
                    
                    if (legalBall) {
                        bowl.balls++;
                        const bo = Math.floor(bowl.balls / 6);
                        const br = bowl.balls % 6;
                        bowl.overs = parseFloat(`${bo}.${br}`);
                    }
                    if (ballData.isWicket && ballData.wicketType !== "Run Out") {
                        bowl.wickets++;
                    }
                    bowl.economy = bowl.balls > 0 ? ((bowl.runs / bowl.balls) * 6).toFixed(2) : 0;
                }

                // --- 5. HANDLE WICKETS ---
                if (ballData.isWicket) {
                    battingTeam.wickets++;
                    match.currentOverHistory.push("W");
                    
                    let outPlayer = match.striker;
                    if (ballData.wicketType === "Run Out") {
                        outPlayer = ballData.whoDismissed === "striker" ? match.striker : match.nonStriker;
                    }

                    // Update Out Player Stats
                    if (match.batsmen[outPlayer]) {
                        match.batsmen[outPlayer].isOut = true;
                        match.batsmen[outPlayer].wicketInfo = `${ballData.wicketType} b ${match.bowler}`;
                    }

                    io.to(matchId).emit("notification", { message: `OUT! ${outPlayer} (${ballData.wicketType})`, type: "wicket" });

                    // Remove the player who got out
                    if (outPlayer === match.striker) match.striker = null;
                    else match.nonStriker = null;

                    // ✅ CHECK LAST MAN STANDING IMMEDIATELY AFTER WICKET
                    const totalPlayers = battingTeam.players.length;
                    const activePlayers = totalPlayers - battingTeam.wickets;

                    if (activePlayers === 1) {
                        // Only one player remains. He MUST be the striker.
                        // If striker got out, the non-striker becomes striker.
                        if (match.striker === null && match.nonStriker !== null) {
                            match.striker = match.nonStriker;
                        }
                        // Force non-striker to null
                        match.nonStriker = null;
                        
                        io.to(matchId).emit("notification", { message: `Last Man Standing: ${match.striker}`, type: "info" });
                    }

                } else {
                    let label = `${runs}`;
                    if (ballData.isWide) label += "wd";
                    if (ballData.isNoBall) label += "nb";
                    match.currentOverHistory.push(label);
                }

                // --- 6. OVER COMPLETION & STRIKE ROTATION ---
                
                // Determine if we should swap based on standard rules
                let shouldSwap = false;
                const isOverComplete = (battingTeam.balls % 6 === 0 && legalBall && battingTeam.balls > 0);

                if (isOverComplete) {
                     match.currentOverHistory = [];
                     match.bowler = null; // New bowler needed
                     io.to(matchId).emit("notification", { message: "Over Completed", type: "over" });
                     shouldSwap = true;
                } 
                else if (legalBall && runs % 2 !== 0) {
                     shouldSwap = true;
                }

                // ✅ CRITICAL FIX: DO NOT SWAP IF NON-STRIKER IS NULL (Single Wicket)
                if (match.nonStriker === null) {
                    shouldSwap = false; 
                }

                // Execute Swap if allowed
                if (shouldSwap) {
                     [match.striker, match.nonStriker] = [match.nonStriker, match.striker];
                }

                // --- 7. GAME STATE CHECK (Innings/Win) ---
                if (match.currentInnings === "A") {
                    const maxBalls = match.maxOvers * 6;
                    // Innings End: All Out OR Max Overs
                    if (battingTeam.wickets === battingTeam.players.length || battingTeam.balls >= maxBalls) {
                        match.currentInnings = "B";
                        match.target = battingTeam.score + 1;
                        match.striker = null; match.nonStriker = null; match.bowler = null;
                        match.currentOverHistory = [];
                        io.to(matchId).emit("notification", { message: `Innings Break! Target: ${match.target}`, type: "inningsBreak" });
                    }
                } 
                else if (match.currentInnings === "B") {
                    const maxBalls = match.maxOvers * 6;
                    
                    if (battingTeam.score >= match.target) {
                        // Team B Wins
                        match.matchStatus = 'completed';
                        match.winner = match.teamB.name;
                        const wicketsLeft = battingTeam.players.length - battingTeam.wickets;
                        match.winMargin = `Won by ${wicketsLeft} wickets`; // Fixed logic
                        io.to(matchId).emit("notification", { message: `🏆 ${match.winner} Wins!`, type: "win" });

                    } else if (battingTeam.wickets === battingTeam.players.length || battingTeam.balls >= maxBalls) {
                        // Team A Wins or Tie
                        if (battingTeam.score < match.target - 1) {
                            match.matchStatus = 'completed';
                            match.winner = match.teamA.name;
                            const runDiff = (match.target - 1) - battingTeam.score;
                            match.winMargin = `Won by ${runDiff} runs`;
                            io.to(matchId).emit("notification", { message: `🏆 ${match.winner} Wins!`, type: "win" });
                        } else {
                            match.matchStatus = 'tie';
                            match.winner = "Tie";
                            match.winMargin = "Match Tied";
                        }
                    }
                }

                // ✅ 8. SAVE CHANGES (Mark Mixed Types)
                match.markModified('batsmen'); 
                match.markModified('bowlers');
                match.markModified('teamA');
                match.markModified('teamB');

                await match.save();
                io.to(matchId).emit("updateMatch", match);

            } catch (err) {
                console.error("Scoring Error:", err);
            }
        });
    });
}