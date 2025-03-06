import cloudinary from '../../config/cloudinary.js';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { CLOUDINARY_PROFILE, CLOUDINARY_AUCTION, CLOUDINARY_PANORAMA } from '../../constant/cloudinary.js';
import randomCharacter from '../randomCharacter.js';

const getFolder = (target) => {
    switch (target) {
        case 'profile':
            return CLOUDINARY_PROFILE;
        case 'auction':
            return CLOUDINARY_AUCTION;
        case 'panorama':
            return CLOUDINARY_PANORAMA;
        default:
            throw new Error('Target not found');
    }
};

export const uploadCloudinary = (target) => {
    const folder = getFolder(target);

    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder,
            format: async (req, file) => {
                const ext = file.mimetype.split('/')[1];
                const allowedFormats = ['png', 'jpg', 'jpeg', 'gif'];
                return allowedFormats.includes(ext) ? ext : 'jpg';
            },
            public_id: (req, file) => {
                const randomStr = randomCharacter(8);
                return randomStr;
            }
        }
    });

    return multer({ storage: storage });
};

export default uploadCloudinary;
