require('dotenv').config();
const fs = require('fs');
const express = require('express');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;
const SELF_URL = process.env.SELF_URL;

app.get('/', (req, res) => {
  res.send('🤖 Bot läuft!');
});

app.listen(PORT, () => {
  console.log(`🌐 Webserver läuft auf Port ${PORT}`);
});

// Selbst-Ping mit dynamischem Import
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

setInterval(() => {
  if (!SELF_URL) return;
  fetch(SELF_URL)
    .then(() => console.log('📡 Selbst-Ping geschickt an', SELF_URL))
    .catch(err => console.log('❌ Selbst-Ping fehlgeschlagen:', err));
}, 280000); // Alle 4 Minuten 40 Sekunden

const TOKEN = process.env.TOKEN;
const RULES_CHANNEL_ID = process.env.RULES_CHANNEL_ID;
const DATA_FILE = './data.json';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Message, Partials.Reaction],
});

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE));
  }
  return {};
}

client.once('ready', async () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);

  const guild = client.guilds.cache.first();
  if (!guild) return console.error('❌ Keine Guild gefunden.');

  const channel = guild.channels.cache.get(RULES_CHANNEL_ID);
  if (!channel) return console.error(`❌ Channel mit ID ${RULES_CHANNEL_ID} nicht gefunden.`);

  const role = guild.roles.cache.find(r => r.name === 'Freigeschaltet');
  if (!role) return console.error('❌ Rolle "Freigeschaltet" nicht gefunden.');

  let data = loadData();
  let ruleMessage;

  if (data.ruleMessageId) {
    try {
      ruleMessage = await channel.messages.fetch(data.ruleMessageId);
      console.log('📜 Regel-Nachricht geladen.');
    } catch {
      console.log('⚠️ Alte Nachricht nicht mehr vorhanden, sende neue.');
    }
  }

  if (!ruleMessage) {
    ruleMessage = await channel.send(
      '📜 Bitte lies die Regeln und reagiere mit ✅, um Zugriff auf den Server zu erhalten.'
    );
    await ruleMessage.react('✅');
    data.ruleMessageId = ruleMessage.id;
    saveData(data);
    console.log('📩 Neue Regel-Nachricht gesendet.');
  }

  try {
    const fetched = await ruleMessage.reactions.cache.get('✅')?.users.fetch();
    if (fetched) {
      for (const [userId, user] of fetched) {
        if (user.bot) continue;
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member && !member.roles.cache.has(role.id)) {
          await member.roles.add(role);
          console.log(`🔁 Rolle nachträglich vergeben an ${user.tag}`);
        }
      }
    }
  } catch (err) {
    console.error('❌ Fehler beim Prüfen bestehender Reaktionen:', err);
  }

  client.on('messageReactionAdd', async (reaction, user) => {
    try {
      if (reaction.partial) await reaction.fetch();
      if (user.bot) return;

      if (reaction.message.id !== ruleMessage.id || reaction.emoji.name !== '✅') return;

      const member = await guild.members.fetch(user.id);
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
        console.log(`✅ Rolle "Freigeschaltet" vergeben an ${user.tag}`);
      }
    } catch (err) {
      console.error('❌ Fehler beim Vergeben der Rolle:', err);
    }
  });
});

client.login(TOKEN);
