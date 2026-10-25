import Match from "../models/Match.js";

export default function setupCricketSocket(io) {
  io.on("connection", (socket) => {
    // --- 1. JOIN MATCH ---
    socket.on("joinMatch", async ({ matchId }) => {
      if (!matchId) return;
      const match = await Match.findOne({ matchId });
      if (match) {
        socket.join(matchId);
        socket.emit("updateMatch", match);
      }
    });

    // --- 2. ADD PLAYER ---
    socket.on("addPlayer", async ({ matchId, playerName, team }) => {
      try {
        const match = await Match.findOne({ matchId });
        if (!match || match.matchStatus === "completed") return;

        const targetTeam = team === "A" ? match.teamA : match.teamB;
        const otherTeam = team === "A" ? match.teamB : match.teamA;

        if (
          targetTeam.players.includes(playerName) ||
          otherTeam.players.includes(playerName)
        )
          return;

        targetTeam.players.push(playerName);

        if (!match.batsmen) match.batsmen = {};
        if (!match.bowlers) match.bowlers = {};

        match.batsmen[playerName] = {
          team,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
        };
        match.bowlers[playerName] = {
          team,
          overs: 0,
          balls: 0,
          runs: 0,
          wickets: 0,
          economy: 0,
        };

        match.markModified("batsmen");
        match.markModified("bowlers");
        await match.save();
        io.to(matchId).emit("updateMatch", match);
      } catch (err) {
        console.error(err);
      }
    });

    // --- 3. UPDATE SETTINGS (Batting First / Overs) ---
    socket.on(
      "updateMatchSettings",
      async ({ matchId, maxOvers, battingFirst }) => {
        try {
          const match = await Match.findOne({ matchId });
          if (!match) return;

          if (maxOvers) match.maxOvers = parseInt(maxOvers);

          // Only allow changing batting team if match hasn't started (0 balls bowled)
          if (
            battingFirst &&
            match.teamA.balls === 0 &&
            match.teamB.balls === 0
          ) {
            match.currentInnings = battingFirst;
          }

          await match.save();
          io.to(matchId).emit("updateMatch", match);
          io.to(matchId).emit("notification", {
            message: "Match Settings Updated",
            type: "info",
          });
        } catch (err) {
          console.error(err);
        }
      }
    );

    // --- 4. SET CURRENT PLAYERS ---
    socket.on(
      "setCurrentPlayers",
      async ({ matchId, striker, nonStriker, bowler }) => {
        try {
          const match = await Match.findOne({ matchId });
          if (!match) return;
          if (striker) match.striker = striker;
          if (nonStriker) match.nonStriker = nonStriker;
          if (bowler) match.bowler = bowler;
          await match.save();
          io.to(matchId).emit("updateMatch", match);
        } catch (err) {
          console.error(err);
        }
      }
    );

    // --- 5. RECORD BALL (CORE LOGIC) ---
    socket.on("recordBall", async ({ matchId, ballData }) => {
      try {
        const match = await Match.findOne({ matchId });
        if (!match || match.matchStatus === "completed") return;

        // 1. Identify Teams based on who is currently batting
        const isInningA = match.currentInnings === "A";
        const battingTeam = isInningA ? match.teamA : match.teamB;
        const bowlingTeam = isInningA ? match.teamB : match.teamA;

        let runs = parseInt(ballData.runs) || 0;
        let extra = 0;
        let legalBall = true;

        // 2. Calculate Runs
        if (ballData.isWide || ballData.isNoBall) {
          extra = 1;
          legalBall = false;
        }
        battingTeam.score += runs + extra;

        if (legalBall) {
          battingTeam.balls++;
          // Calculate overs (e.g., 0.1, 0.2)
          const totalBalls = battingTeam.balls;
          battingTeam.overs = parseFloat(
            `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`
          );
        }

        // 3. Update Batsman
        if (match.striker && legalBall && !ballData.isWide) {
          if (!match.batsmen[match.striker]) {
            match.batsmen[match.striker] = {
              team: battingTeam.name,
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              strikeRate: 0,
              isOut: false,
            };
          }
          const bat = match.batsmen[match.striker];
          bat.runs += runs;
          bat.balls += 1;
          if (runs === 4) bat.fours++;
          if (runs === 6) bat.sixes++;
          bat.strikeRate =
            bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(2) : 0;
        }

        // 4. Update Bowler
        if (match.bowler) {
          if (!match.bowlers[match.bowler]) {
            match.bowlers[match.bowler] = {
              team: bowlingTeam.name,
              overs: 0,
              balls: 0,
              runs: 0,
              wickets: 0,
              economy: 0,
            };
          }
          const bowl = match.bowlers[match.bowler];
          bowl.runs += runs + extra;
          if (legalBall) {
            bowl.balls++;
            const totalBalls = bowl.balls;
            bowl.overs = parseFloat(
              `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`
            );
          }
          if (ballData.isWicket && ballData.wicketType !== "Run Out")
            bowl.wickets++;
          bowl.economy =
            bowl.balls > 0 ? ((bowl.runs / bowl.balls) * 6).toFixed(2) : 0;
        }

        // 5. Wicket Logic
        if (ballData.isWicket) {
          battingTeam.wickets++;
          match.currentOverHistory.push("W");

          let outPlayer = match.striker;
          if (ballData.wicketType === "Run Out" && ballData.whoDismissed) {
            outPlayer =
              ballData.whoDismissed === "striker"
                ? match.striker
                : match.nonStriker;
          }

          if (match.batsmen[outPlayer]) {
            match.batsmen[outPlayer].isOut = true;
            match.batsmen[outPlayer].wicketInfo = ballData.wicketType;
          }
          io.to(matchId).emit("notification", {
            message: `OUT! ${outPlayer}`,
            type: "wicket",
          });

          if (outPlayer === match.striker) match.striker = null;
          else match.nonStriker = null;

          // Last Man Standing Logic (If only 1 wicket left)
          const playersCount = battingTeam.players.length;
          if (playersCount - battingTeam.wickets === 1) {
            if (match.striker === null && match.nonStriker !== null)
              match.striker = match.nonStriker;
            match.nonStriker = null;
          }
        } else {
          let label = `${runs}`;
          if (ballData.isWide) label += "wd";
          if (ballData.isNoBall) label += "nb";
          match.currentOverHistory.push(label);
        }

        // 6. Strike Rotation
        let shouldSwap = false;
        const isOverEnd =
          battingTeam.balls % 6 === 0 && legalBall && battingTeam.balls > 0;

        if (legalBall && runs % 2 !== 0) shouldSwap = true;
        if (isOverEnd) shouldSwap = true;
        if (match.nonStriker === null) shouldSwap = false; // Cannot swap if alone

        if (shouldSwap && match.striker && match.nonStriker) {
          [match.striker, match.nonStriker] = [match.nonStriker, match.striker];
        }

        if (isOverEnd) {
          match.currentOverHistory = [];
          match.bowler = null;
          io.to(matchId).emit("notification", {
            message: "Over Completed",
            type: "over",
          });
        }

        // --- 7. GAME STATE & WINNER LOGIC (ROBUST VERSION) ---

        const maxBalls = match.maxOvers * 6;
        // All Out if wickets == total players OR total players - 1 (Last man standing rule applied usually)
        const allOut =
          battingTeam.wickets === battingTeam.players.length ||
          (battingTeam.players.length > 1 &&
            battingTeam.wickets === battingTeam.players.length - 1);

        
        // It is 2nd innings IF:
        // 1. Target is already set (> 0)
        // 2. OR: Current Batting Team is A, but Team B has played balls (meaning B batted first)
        // 3. OR: Current Batting Team is B, but Team A has played balls (meaning A batted first)
        const isSecondInnings =
          (match.target && match.target > 0) ||
          (match.currentInnings === "A" && match.teamB.balls > 0) ||
          (match.currentInnings === "B" && match.teamA.balls > 0);

        if (!isSecondInnings) {
          // --- 1ST INNINGS LOGIC ---
          if (allOut || battingTeam.balls >= maxBalls) {
            // End of Innings
            match.target = battingTeam.score + 1;

            // Switch Innings
            match.currentInnings = match.currentInnings === "A" ? "B" : "A";

            // Reset Crease
            match.striker = null;
            match.nonStriker = null;
            match.bowler = null;
            match.currentOverHistory = [];

            io.to(matchId).emit("notification", {
              message: `Innings Break! Target: ${match.target}`,
              type: "break",
            });
          }
        } else {
          // --- 2ND INNINGS LOGIC (CHASE) ---

          // Safety: If target got lost (Schema issue), recalculate it
          if (!match.target) {
            match.target = bowlingTeam.score + 1;
          }

          if (battingTeam.score >= match.target) {
            // BATTING TEAM WINS
            match.matchStatus = "completed";
            match.winner = battingTeam.name;
            io.to(matchId).emit("notification", {
              message: `🏆 ${battingTeam.name} Wins!`,
              type: "win",
            });
          } else if (allOut || battingTeam.balls >= maxBalls) {
            // OVERS FINISHED or ALL OUT
            if (battingTeam.score < match.target - 1) {
              // BOWLING TEAM WINS
              match.matchStatus = "completed";
              match.winner = bowlingTeam.name;
              io.to(matchId).emit("notification", {
                message: `🏆 ${bowlingTeam.name} Wins!`,
                type: "win",
              });
            } else {
              // TIE
              match.matchStatus = "tie";
              match.winner = "Tie";
              io.to(matchId).emit("notification", {
                message: "Match Tied!",
                type: "info",
              });
            }
          }
        }

        // 8. Save
        match.markModified("batsmen");
        match.markModified("bowlers");
        match.markModified("teamA");
        match.markModified("teamB");
        await match.save();
        io.to(matchId).emit("updateMatch", match);
      } catch (err) {
        console.error(err);
      }
    });
  });
}
