/**
 * Google Gemini API integration helper for DRHV Cricket.
 * Uses a lightweight direct browser fetch, avoiding heavy external SDKs.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Common call helper to send prompt to Gemini.
 */
async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    console.warn("Gemini API key is missing in your environment configuration.");
    return "AI insights are currently unavailable because the API Key is not configured.";
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Gemini API responded with status ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return resultText || "Sorry, I was unable to compile the analysis at this time.";
  } catch (error) {
    console.error("Error communicating with Gemini API:", error);
    return `Error generating AI analysis: ${error.message}. Please check your network connection and API quotas.`;
  }
}

/**
 * Feature 1: AI Match News & Post-Match Summary Writer
 */
export async function generateMatchSummary(match, innings, teams) {
  const team1Name = match.team1?.name || "Team 1";
  const team2Name = match.team2?.name || "Team 2";
  const status = match.status;
  const stage = match.stage || "League Stage";
  const venue = match.venue || "DRHV Stadium";
  const resultMargin = match.result_margin || "";

  // Compile innings data
  const inn1 = innings?.find((i) => i.innings_number === 1);
  const inn2 = innings?.find((i) => i.innings_number === 2);

  const inn1Score = inn1 ? `${inn1.runs}/${inn1.wickets} (${Math.floor(inn1.total_balls / 6)}.${inn1.total_balls % 6} ov)` : "N/A";
  const inn2Score = inn2 ? `${inn2.runs}/${inn2.wickets} (${Math.floor(inn2.total_balls / 6)}.${inn2.total_balls % 6} ov)` : "Yet to bat";

  let prompt = `
    You are a professional sports news reporter and cricket commentator writing a summary article for a local housing society's premium cricket tournament, the DRHV Premier League.
    Write a dramatic, highly engaging, and witty news flash report for this match.
    
    Match Information:
    - Stage: ${stage}
    - Venue: ${venue}
    - Status: ${status}
    - Teams: ${team1Name} vs ${team2Name}
    - First Innings Score (${inn1 ? (inn1.batting_team_id === match.team1_id ? team1Name : team2Name) : "N/A"}): ${inn1Score}
    - Second Innings Score (${inn2 ? (inn2.batting_team_id === match.team1_id ? team1Name : team2Name) : "Yet to bat"}): ${inn2Score}
    - Result / Outcome: ${resultMargin || "Match in progress"}

    Please format the response nicely in standard Markdown:
    1. Write a catchy newspaper headline at the top.
    2. Write a 2-paragraph dramatic storytelling overview describing the flow, the turning points, and key moments.
    3. Include a short bulleted list labeled "💡 AI KEY TAKEAWAYS" highlighting the strategic turning points.
    Make the tone exciting, funny, and engaging for society members! Do not mention internal variables or raw balls count unless formatted gracefully.
  `;

  return await callGemini(prompt);
}

/**
 * Feature 2: AI Live Ball-by-Ball Commentary Narrator
 */
export async function generateAICommentary(ball, lastFiveBallsText = "") {
  const batsmanName = ball.batsman?.name || "Batsman";
  const bowlerName = ball.bowler?.name || "Bowler";
  const runs = ball.runs_batsman;
  const extras = ball.runs_extras;
  const extraType = ball.extra_type;
  const isWicket = ball.is_wicket;
  const wicketType = ball.wicket_type;

  let eventDescription = "";
  if (isWicket) {
    eventDescription = `OUT! The batsman is dismissed by ${wicketType}!`;
  } else if (extraType !== "none") {
    eventDescription = `${extraType.toUpperCase()}! ${extras} extra runs conceded.`;
  } else if (runs === 4) {
    eventDescription = "FOUR RUNS! Boundary hit!";
  } else if (runs === 6) {
    eventDescription = "SIX RUNS! Smashed out of the ground!";
  } else if (runs === 0) {
    eventDescription = "Dot ball. Tidy delivery.";
  } else {
    eventDescription = `${runs} run(s) scored.`;
  }

  let prompt = `
    You are a passionate, high-energy live cricket commentator (like Danny Morrison or Harsha Bhogle) broadcasting a match.
    Generate a SINGLE sentence of thrilling, charismatic live narration for this delivery:
    
    Delivery Details:
    - Bowler: ${bowlerName}
    - Batsman: ${batsmanName}
    - Event: ${eventDescription}
    - Runs scored: ${runs}
    - Extras: ${extraType === "none" ? "None" : `${extras} (${extraType})`}
    
    Keep the sentence short, punchy, and incredibly realistic! Avoid generic phrasing. Generate ONLY the commentary line. No extra greeting or intro.
  `;

  return await callGemini(prompt);
}

/**
 * Feature 3: AI Player Scouting & Performance Insights
 */
export async function generatePlayerInsights(player, battingStats, bowlingStats, matchLogs) {
  const name = player.name;
  const role = player.role ? player.role.replace("_", " ") : "All Rounder";
  const teamName = player.team?.name || "Free Agent";
  const jersey = player.jersey_number || "N/A";

  const batMatches = battingStats?.matches || 0;
  const batRuns = battingStats?.runs || 0;
  const batAvg = battingStats?.batting_average || "N/A";
  const batSR = battingStats?.strike_rate || "N/A";
  const batHigh = battingStats?.high_score || 0;
  
  const bowlWkts = bowlingStats?.wickets || 0;
  const bowlEco = bowlingStats?.economy_rate || "N/A";
  const bowlOvers = bowlingStats?.overs || 0;

  // Summarize recent match logs
  const logsSummary = matchLogs && matchLogs.length > 0 
    ? matchLogs.slice(-3).map((log) => `vs ${log.opponent}: Bat ${log.batRuns ?? 0} runs (${log.batOutStatus}), Bowl ${log.bowlOvers ?? 0} ov, ${log.bowlWickets ?? 0} wkts`).join("; ")
    : "No recent match records.";

  let prompt = `
    You are a professional cricket coach and tactical selector for the DRHV Premier League.
    Perform an elite coaching and scouting assessment for the following player based on their tournament stats:
    
    Player Profile:
    - Name: ${name}
    - Role: ${role}
    - Team: ${teamName}
    - Jersey Number: ${jersey}
    
    Batting Statistics:
    - Matches: ${batMatches}
    - Total Runs: ${batRuns}
    - High Score: ${batHigh}
    - Average: ${batAvg}
    - Strike Rate: ${batSR}
    
    Bowling Statistics:
    - Wickets: ${bowlWkts}
    - Overs: ${bowlOvers}
    - Economy Rate: ${bowlEco}
    
    Recent Form (Last 3 matches):
    ${logsSummary}
    
    Format the response beautifully in Markdown:
    1. Write a short, highly motivating one-sentence **"AI Scout Summary Statement"** summarizing their profile in a creative light (e.g., "The solid middle-order anchor with a lethal spin bowling option").
    2. Write a bulleted list of 2 key **"💪 STRENGTHS"** analyzing their statistical form.
    3. Write a bulleted list of 1-2 potential **"⚠️ AREA OF IMPROVEMENT"** based on form or stats.
    4. Write a paragraph labeled **"🎯 COACH RECOMMENDATIONS"** with tactical tips to improve their performance next match.
    
    Keep the tone highly professional, analytical, and supportive! Be concise.
  `;

  return await callGemini(prompt);
}
