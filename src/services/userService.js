import { file } from 'googleapis/build/src/apis/file/index.js';
import User from '../models/userModel.js';
import { generateAccessToken } from '../utils/jwt.js';

class UserService {
    async inserData(userData) {
      const { email, name, purchase } = userData;
  
      let user = await User.findOne({ email });
      if (user) {
        user.purchases.push(purchase);
        user.updatedAt = Date.now();
        await user.save();
      } else {
        user = await User.create({ email, name, purchases: [purchase] });
      }
      return { user };
    }

    async getDetails(userData) {
      const { email, fileid } = userData;
      let user = await User.findOne({ email }).lean();
      if (user) {
      const filePurchase = user.purchases.find(purchase => purchase.fileid === fileid && purchase.status === 'success');
      return { user, filePurchase: filePurchase ? true : false };
      }
      return null;
    }

  async getDetailsById(id) {
    let user = await User.findById(id);
    if (user) return user;
    else return null;
  }

  async getDetailsByEmail(email) {
    let user = await User.findOne({ email });
    if (user) return user;
    else return null;
  }

  async saveContactUser(userData) {
    const contact = new Contact({name,email,message})
    await contact.save()
    return contact;
  }
    
}
export default new UserService();
