import { Pipe, PipeTransform } from '@angular/core';

/**
 * Masks an account number to show only the last 4 digits
 * Example: "1234567890123456" -> "**** **** **** 3456"
 */
@Pipe({
  name: 'maskAccountNumber',
  standalone: true
})
export class MaskAccountNumberPipe implements PipeTransform {
  transform(accountNumber: string | undefined, showDigits: number = 4): string {
    if (!accountNumber) {
      return '****';
    }

    // Remove any spaces or dashes from the account number
    const cleaned = accountNumber.replace(/[\s-]/g, '');
    
    if (cleaned.length <= showDigits) {
      return '*'.repeat(cleaned.length);
    }

    // Get the last digits to show
    const lastDigits = cleaned.slice(-showDigits);
    
    // Calculate number of masked sections (each section is 4 characters)
    const maskedSections = Math.ceil((cleaned.length - showDigits) / 4);
    const maskedPart = Array(maskedSections).fill('****').join(' ');
    
    return `${maskedPart} ${lastDigits}`;
  }
}
