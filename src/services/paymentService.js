import User from "../models/userModel.js";



export const isPaymentSuccessCheck = async (email,pid,fileid) => {
  if(!email || !pid || !fileid){
    return false;
  }
  try{
    const user = await User.findOne({email});
    if(!user){
      return false;
    }
    const filedetails = user.purchases.find(purchase => purchase.pid === pid && purchase.fileid === fileid);
    if(!filedetails){
      return false;
    }
    return true;
  }
  catch(err){
    return false;
  }
}
