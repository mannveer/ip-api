import User from '../models/user.model';
import Contact from '../models/contact.model';
import { IUserService, IUserRequest, IUser, IContactRequest, IContact } from '../interfaces/user.interface';
import logger from '../utils/logger';

class UserService implements IUserService {
  /**
   * Insert or update user data
   */
  async insertData(userData: IUserRequest): Promise<{ user: IUser }> {
    const { email, name, purchase } = userData;

    try {
      let user = await User.findOne({ email }).exec();
      
      if (user) {
        if (purchase) {
          user.purchases = user.purchases || [];
          user.purchases.push(purchase);
        }
        
        if (name && !user.name) {
          user.name = name;
        }
        
        user.updatedAt = new Date();
        await user.save();
      } else {
        user = await User.create({ 
          email, 
          name: name || email.split('@')[0], 
          purchases: purchase ? [purchase] : [] 
        });
      }
      
      return { user };
    } catch (error) {
      logger.error('Error inserting user data:', error);
      throw new Error('Failed to save user data');
    }
  }

  /**
   * Get user details with file purchase status
   */
  async getDetails(userData: { email: string; fileid: string }): Promise<{ user: IUser; filePurchase: boolean } | null> {
    const { email, fileid } = userData;
    
    try {
      const user = await User.findOne({ email }).lean();
      
      if (!user) {
        return null;
      }
      
      // Check if user has purchased the file
      const filePurchase = user.purchases?.some(
        purchase => purchase.notes.fileId.toString() === fileid && purchase.status === 'success'
      ) || false;
      
      return { user, filePurchase };
    } catch (error) {
      logger.error('Error getting user details:', error);
      throw new Error('Failed to retrieve user details');
    }
  }

  /**
   * Get user details by ID
   */
  async getDetailsById(id: string): Promise<IUser | null> {
    try {
      return await User.findById(id);
    } catch (error) {
      logger.error(`Error getting user by ID ${id}:`, error);
      throw new Error('Failed to retrieve user');
    }
  }

  /**
   * Get user details by email
   */
  async getDetailsByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email });
    } catch (error) {
      logger.error(`Error getting user by email ${email}:`, error);
      throw new Error('Failed to retrieve user');
    }
  }

  /**
   * Save contact form data
   */
  async saveContactUser(userData: IContactRequest): Promise<IContact> {
    try {
      const { name, email, message } = userData;
      const contact = await Contact.create({ name, email, message });
      return contact;
    } catch (error) {
      logger.error('Error saving contact data:', error);
      throw new Error('Failed to save contact information');
    }
  }
}

export default new UserService();
