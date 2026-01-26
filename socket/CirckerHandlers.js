import Match from "../models/Match.js";

export default function setupCricketSocket(io) {
    
    io.on("connection", (socket) => {
        console.log(`⚡ Socket Connected: ${socket.id}`);

        // --- 1. JOIN MATCH ---
        socket.on("joinMatch", async ({ matchId }) => {
            if (!matchId) return;
            socket.join(matchId);
            const match = await Match.findOne({ matchId });
            if (match) socket.emit("updateMatch", match);
        });

        // --- 2. ADD PLAYERS (Manual Setup) ---
        socket.on("addPlayer", async ({ matchId, playerName, team }) => {
            try {
                const match = await Match.findOne({ matchId });
                if (!match || match.matchStatus === 'completed') return;

                // Validation: Only allow adding if player is in Settlement List (if you enabled that restriction)
                // if (!match.eligiblePlayers.includes(playerName)) { ... error ... }

                const targetTeam = team === "A" ? match.teamA : match.teamB;
                const otherTeam = team === "A" ? match.teamB : match.teamA;

                if (targetTeam.players.includes(playerName) || otherTeam.players.includes(playerName)) {
                    socket.emit("error", { message: "Player already in a team" });
                    return;
                }

                targetTeam.players.push(playerName);
                
                // Initialize Empty Stats
                match.batsmen.set(playerName, { team, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false });
                match.bowlers.set(playerName, { team, overs: 0, balls: 0, runs: 0, wickets: 0, economy: 0 });

                await match.save();
                io.to(matchId).emit("updateMatch", match);
            } catch (err) { console.error(err); }
        });

        // --- 3. SET CURRENT PLAYERS ---
        socket.on("setCurrentPlayers", async ({ matchId, striker, nonStriker, bowler }) => {
            const match = await Match.findOne({ matchId });
            if (match && match.matchStatus !== 'completed') {
                if (striker) match.striker = striker;
                if (nonStriker) match.nonStriker = nonStriker;
                if (bowler) match.bowler = bowler;
                await match.save();
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

        // --- 5. MAIN SCORING LOGIC ---
        socket.on("recordBall", async ({ matchId, ballData }) => {
            try {
                const match = await Match.findOne({ matchId });
                if (!match || match.matchStatus === 'completed') return;

                // Determine who is batting
                const isInningA = match.currentInnings === "A";
                const battingTeam = isInningA ? match.teamA : match.teamB;
                const bowlingTeam = isInningA ? match.teamB : match.teamA;

                let runs = parseInt(ballData.runs) || 0;
                let extra = 0;
                let legalBall = true;

                // --- A. CALCULATE RUNS & EXTRAS ---
                if (ballData.isWide || ballData.isNoBall) {
                    extra = 1;
                    legalBall = false; // Does not count as a legal delivery
                }

                // Update Team Score
                battingTeam.score += runs + extra;
                
                // Update Ball Count (Only legal balls count towards Over)
                if (legalBall) {
                    battingTeam.balls++;
                    // Update Overs Display (e.g. 0.5 -> 1.0)
                    const completed = Math.floor(battingTeam.balls / 6);
                    const rem = battingTeam.balls % 6;
                    battingTeam.overs = parseFloat(`${completed}.${rem}`);
                }

                // --- B. UPDATE BATSMAN STATS ---
                if (match.striker && legalBall && !ballData.isWide) {
                    let batStats = match.batsmen.get(match.striker);
                    if (batStats) {
                        batStats.runs += runs;
                        batStats.balls += 1;
                        if (runs === 4) batStats.fours++;
                        if (runs === 6) batStats.sixes++;
                        batStats.strikeRate = ((batStats.runs / batStats.balls) * 100).toFixed(2);
                        match.batsmen.set(match.striker, batStats);
                    }
                }

                // --- C. UPDATE BOWLER STATS ---
                if (match.bowler) {
                    let bowlStats = match.bowlers.get(match.bowler);
                    if (bowlStats) {
                        bowlStats.runs += runs + extra;
                        if (legalBall) {
                            bowlStats.balls++;
                            const bo = Math.floor(bowlStats.balls / 6);
                            const br = bowlStats.balls % 6;
                            bowlStats.overs = parseFloat(`${bo}.${br}`);
                        }
                        if (ballData.isWicket && ballData.wicketType !== "Run Out") {
                            bowlStats.wickets++;
                        }
                        bowlStats.economy = bowlStats.balls > 0 ? ((bowlStats.runs / bowlStats.balls) * 6).toFixed(2) : 0;
                        match.bowlers.set(match.bowler, bowlStats);
                    }
                }

                // --- D. HANDLE WICKETS ---
                if (ballData.isWicket) {
                    battingTeam.wickets++;
                    match.currentOverHistory.push("W");
                    
                    let outPlayer = match.striker;
                    if (ballData.wicketType === "Run Out") {
                        outPlayer = ballData.whoDismissed === "striker" ? match.striker : match.nonStriker;
                    }

                    // Mark Batmsan as Out
                    let batStats = match.batsmen.get(outPlayer);
                    if (batStats) {
                        batStats.isOut = true;
                        batStats.wicketInfo = `${ballData.wicketType} b ${match.bowler}`;
                        match.batsmen.set(outPlayer, batStats);
                    }

                    io.to(matchId).emit("notification", { message: `OUT! ${outPlayer} (${ballData.wicketType})`, type: "wicket" });

                    // Remove from crease
                    if (outPlayer === match.striker) match.striker = null;
                    else match.nonStriker = null;

                } else {
                    // Update Over History Display
                    let label = `${runs}`;
                    if (ballData.isWide) label += "wd";
                    if (ballData.isNoBall) label += "nb";
                    match.currentOverHistory.push(label);
                }

                // --- E. OVER COMPLETION ---
                if (battingTeam.balls % 6 === 0 && legalBall && battingTeam.balls > 0) {
                    match.currentOverHistory = []; // Clear for next over
                    // Swap Ends
                    [match.striker, match.nonStriker] = [match.nonStriker, match.striker];
                    match.bowler = null; // Require new bowler
                    io.to(matchId).emit("notification", { message: "Over Completed", type: "over" });
                } else if (legalBall && runs % 2 !== 0) {
                    // Swap Ends on odd runs
                    [match.striker, match.nonStriker] = [match.nonStriker, match.striker];
                }

                // --- F. GAME STATE CHECK (The Complex Logic) ---
                
                // 1. Check if Innings A just finished
                if (match.currentInnings === "A") {
                    // Innings Ends if: 10 Wickets OR Max Overs reached
                    const maxBalls = match.maxOvers * 6;
                    
                    if (battingTeam.wickets === 10 || battingTeam.balls >= maxBalls) {
                        console.log("🔁 Switching Innings...");
                        
                        // Switch to Team B
                        match.currentInnings = "B";
                        match.target = battingTeam.score + 1;
                        
                        // Reset Field
                        match.striker = null;
                        match.nonStriker = null;
                        match.bowler = null;
                        match.currentOverHistory = [];
                        
                        io.to(matchId).emit("notification", { 
                            message: `Innings Break! Target: ${match.target}`, 
                            type: "inningsBreak" 
                        });
                    }
                }
                
                // 2. Check if Match is Over (During Innings B)
                else if (match.currentInnings === "B") {
                    const maxBalls = match.maxOvers * 6;
                    
                    // CASE 1: Team B Chased Target -> WIN
                    if (battingTeam.score >= match.target) {
                        match.matchStatus = 'completed';
                        match.winner = match.teamB.name;
                        const wicketsLeft = 10 - battingTeam.wickets;
                        match.winMargin = `Won by ${wicketsLeft} wickets`;
                        
                        io.to(matchId).emit("notification", { message: `🏆 ${match.winner} Wins!`, type: "win" });
                    }
                    
                    // CASE 2: Team B All Out OR Overs Finished (And score < target) -> LOSE
                    else if (battingTeam.wickets === 10 || battingTeam.balls >= maxBalls) {
                        if (battingTeam.score < match.target - 1) { // -1 because target is score+1
                             match.matchStatus = 'completed';
                             match.winner = match.teamA.name;
                             const runDiff = (match.target - 1) - battingTeam.score;
                             match.winMargin = `Won by ${runDiff} runs`;
                             
                             io.to(matchId).emit("notification", { message: `🏆 ${match.winner} Wins!`, type: "win" });
                        } else {
                            // TIE CASE
                            match.matchStatus = 'tie';
                            match.winner = "Tie";
                            match.winMargin = "Super Over required!";
                        }
                    }
                }

                // Save everything
                await match.save();
                io.to(matchId).emit("updateMatch", match);

            } catch (err) {
                console.error("Scoring Error:", err);
            }
        });
    });
}