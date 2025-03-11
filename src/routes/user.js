import express from 'express';
const router = express.Router();
import account from '../services/user/account.js';
import auction from '../services/user/auction.js';
import bid from '../services/user/bid.js';
import transaction from '../services/user/transaction.js';
import withdraw from '../services/user/withdraw.js';
import verification from '../middleware/verification.js';

router.use('/account', account);
router.use('/auctions', verification(["User"]), auction);
router.use('/bids', verification(["User"]), bid);
router.use('/transactions', verification(["User"]), transaction);
router.use('/withdraws', verification(["User"]), withdraw);

export default router