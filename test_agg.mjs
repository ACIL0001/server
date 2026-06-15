import mongoose from 'mongoose';
await mongoose.connect('mongodb://127.0.0.1:27017/election');
const r = await mongoose.connection.db.collection('result desks').findOne();
const d = await mongoose.connection.db.collection('desks').findOne({_id: r.desk});
const res = await mongoose.connection.db.collection('result desks').aggregate([
  { $lookup: { from: 'desks', localField: 'desk', foreignField: '_id', as: '_desk' } },
  { $unwind: '$_desk' },
  { $match: { '_desk.wilaya': d.wilaya } }
]).toArray();
console.log('aggregated length:', res.length);
process.exit(0);
