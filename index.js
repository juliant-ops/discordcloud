const { Client, GatewayIntentBits, Partials } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Reaction]
});

const TOKEN = 'MTM4Njc3NTU1ODgwMDgwMTgzMg.Gfg52a.n54NCMNAgu4YYLzzfBM0YRTkUiUb1eVqtOXMM0';

client.on('ready', async () => {
  console.log(`Bot ist online als ${client.user.tag}`);

  // 1. Kanal und Guild holen
  const guild = client.guilds.cache.first();
  const channel = guild.channels.cache.find(ch => ch.name === 'regeln');
  if (!channel) return console.error('Kanal #regeln nicht gefunden');

  // 2. Regel-Nachricht senden und ✅-Reaction hinzufügen
  const msg = await channel.send(
    'Bitte lies die Regeln und reagiere hier mit ✅, um Zugriff auf alle Channels zu bekommen.'
  );
  await msg.react('✅');

  // 3. Reaction-Handler registrieren
  client.on('messageReactionAdd', async (reaction, user) => {
    // Nur unsere Regel-Nachricht & nur ✅ berücksichtigen
    if (reaction.message.id !== msg.id) return;
    if (reaction.emoji.name !== '✅') return;

    const member = await guild.members.fetch(user.id);
    const role = guild.roles.cache.find(r => r.name === 'Freigeschaltet');
    if (member && role) {
      await member.roles.add(role);
      console.log(`Rolle "Freigeschaltet" vergeben an ${user.tag}`);
    }
  });
});

client.login(TOKEN);
