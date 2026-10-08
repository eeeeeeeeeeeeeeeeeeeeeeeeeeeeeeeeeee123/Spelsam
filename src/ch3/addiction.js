(() => {
  // Which vice the player picked in level 1 of chapter 3. Set per run; the
  // boss level reads it. "drank" | "drugs" | "gokken".
  G.addiction = null;

  G.ADDICTIONS = {
    drank: { label: "Drank", color: "#ffd24a", emoji: "🍺" },
    drugs: { label: "Drugs", color: "#7fe08a", emoji: "💊" },
    gokken: { label: "Gokken", color: "#ff6b9d", emoji: "🎰" },
  };

  G.setAddiction = (id) => {
    G.addiction = id;
  };
})();
