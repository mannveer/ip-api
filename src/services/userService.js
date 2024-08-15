import User from '../models/userModel.js';
import { createToken } from '../utils/jwt.js';
import { jwtSecret, jwtExpiresIn } from '../config/config.js';

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
  
      const token = createToken(user._id, jwtSecret, jwtExpiresIn);
      return { user, token };
    }

    async getDetails(userData) {
      const { email, name } = userData;
      let user = await User.findOne({email,name});
      if(user)
        return user;
      else
        return null;
}

  async getDetailsById(id) {
    let user = await User.findById(id);
    if (user) return user;
    else return null;
  }
}
export default new UserService();
