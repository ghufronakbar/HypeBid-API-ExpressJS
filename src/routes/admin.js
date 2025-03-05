import express from 'express';
const router = express.Router();
import account from '../services/admin/account.js';
import user from '../services/admin/user.js';
import transaction from '../services/admin/transaction.js';
import auction from '../services/admin/auction.js';
import withdraw from '../services/admin/withdraw.js';
import verification from '../middleware/verification.js';

router.use('/account', account);
router.use('/users', verification(["Admin"]), user);
router.use('/transactions', verification(["Admin"]), transaction);
router.use('/auctions', verification(["Admin"]), auction);
router.use('/withdraws', verification(["Admin"]), withdraw);

export default router