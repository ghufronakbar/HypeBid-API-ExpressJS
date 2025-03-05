import express from 'express';
const router = express.Router();
import account from '../services/mobile/account.js';
import auction from '../services/mobile/auction.js';
import bid from '../services/mobile/bid.js';
import transaction from '../services/mobile/transaction.js';
import verification from '../middleware/verification.js';

router.use('/account', account);
router.use('/auctions', verification(["User"]), auction);
router.use('/bids', verification(["User"]), bid);
router.use('/transactions', verification(["User"]), transaction);

export default router