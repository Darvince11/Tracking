const crypto = require('crypto');
const prisma = require('../config/prisma');

class IdGenerator {
  static async generateEmployeeId(department) {
    const deptCode = department.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    
    return `EMP-${deptCode}-${timestamp}-${random}`;
  }

  static async generateTrackingNumber(type) {
    const year = new Date().getFullYear();
    
    const result = await prisma.$transaction(async (tx) => {
      const sequence = await tx.trackingSequence.upsert({
        where: {
          type_year: { type, year }
        },
        update: {
          sequence: { increment: 1 }
        },
        create: {
          type,
          year,
          sequence: 1
        }
      });

      const sequenceNum = sequence.sequence.toString().padStart(6, '0');
      const prefix = type === 'PROJECT' ? 'PROJ' : 'TKT';
      
      return `${prefix}-${year}-${sequenceNum}`;
    });

    await prisma.$disconnect();
    return result;
  }

  static generateTempPassword() {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let password = '';
    
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[crypto.randomInt(0, 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[crypto.randomInt(0, 26)];
    password += '0123456789'[crypto.randomInt(0, 10)];
    password += '!@#$%^&*()'[crypto.randomInt(0, 10)];
    
    for (let i = password.length; i < length; i++) {
      password += charset[crypto.randomInt(0, charset.length)];
    }
    
    return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
  }
}

module.exports = { IdGenerator };
