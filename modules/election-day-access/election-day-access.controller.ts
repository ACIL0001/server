import type { RequestHandler } from "express";
import { ElectionDay } from "./election-day-access.model";
import { getIO } from "../../socket";

/**
 * Ensures the singleton document exists, returns it.
 */
async function getOrCreateSettings() {
  let settings = await ElectionDay.findOne();
  if (!settings) {
    settings = await ElectionDay.create({ is_election_day_open: false });
  }
  return settings;
}

export const getPublicSettings: RequestHandler = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ ok: true, is_election_day_open: settings.is_election_day_open });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
};

export const updateSettings: RequestHandler = async (req, res) => {
  try {
    const { is_election_day_open } = req.body;
    const settings = await getOrCreateSettings();
    
    settings.is_election_day_open = Boolean(is_election_day_open);
    await settings.save();

    // Broadcast the status change to all connected clients
    const io = getIO();
    if (io) {
      io.emit("election:status_changed", { isOpen: settings.is_election_day_open });
    }

    res.json({ ok: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
};
