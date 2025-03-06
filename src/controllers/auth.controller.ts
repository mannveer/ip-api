const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const User = require('../models/User');

exports.login = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !await user.comparePassword(password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store the refresh token in the database
    user.refreshToken = refreshToken;
    await user.save();

    // Send tokens to client
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.status(200).json({ accessToken });
};

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) throw new Error('Refresh token not provided');

        const decoded = verifyRefreshToken(refreshToken);

        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== refreshToken) {
            throw new Error('Invalid refresh token');
        }

        const newAccessToken = generateAccessToken(user);
        res.status(200).json({ accessToken: newAccessToken });
    } catch (err) {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

exports.logout = async (req, res) => {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.id);
        if (user) {
            user.refreshToken = null; // Invalidate refresh token
            await user.save();
        }
        res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'strict' });
    }
    res.status(200).json({ message: 'Logged out successfully' });
};
