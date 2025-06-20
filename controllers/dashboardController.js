const getUserDetails = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Exclude sensitive info if needed
  const { password, ...userDetails } = req.user;
  res.json({ user: userDetails });
};

const getAdminDetails = (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  // Exclude sensitive info if needed
  const { password, ...adminDetails } = req.user;
  res.json({ admin: adminDetails });
};

module.exports = { getUserDetails, getAdminDetails };
