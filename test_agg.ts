import mongoose from 'mongoose';
await mongoose.connect('mongodb://127.0.0.1:27017/election');
const { ResultDesk } = await import('./modules/result-desk/result-desk.model.ts');
const { Desk } = await import('./modules/desk/desk.model.ts');

const desk = await Desk.findOne();
const wilayaId = desk.wilaya.toString();

const a = await ResultDesk.aggregate([
  { $lookup: { from: 'desks', localField: 'desk', foreignField: '_id', as: '_desk' } },
  { $unwind: '$_desk' },
  { $match: { '_desk.wilaya': new mongoose.Types.ObjectId(wilayaId) } }
]);

console.log('agg length with match:', a.length);
process.exit(0);
