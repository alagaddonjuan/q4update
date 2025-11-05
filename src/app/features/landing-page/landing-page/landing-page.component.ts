import { CommonModule, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [CommonModule, NgClass],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class LandingPageComponent {
  isMenuOpen = false;

  faqs = [
    {
      question: 'What does Q4I Coms do?',
      answer: `Q4 International Ltd is a technology company offering communication infrastructure to software developers, businesses and organizations via a unified API. We offer services including: Bulk SMS, USSD, Airtime, Data, WhatsApp and Telegram across over 250 telecommunications service providers in Africa, the America's, Asia and Europe. <br> <br>
        For Bulk SMS, we have two options: a robust API you can easily integrate with that will allow you to automatically send out messages and a plug and play web-based platform that you log into, upload contacts, schedule messages and send. Sending messages has never been easier. please see more https://coms.q4iltd.com`,
      isOpen: false,
    },
    {
      question: 'Monthly Maintenance Fee Deductions Schedule?',
      answer: `This timeline outlines the key dates and events for the automatic deduction of monthly maintenance fees, starting with the first deduction on 1st October 2025.<br> <br>
        19th of the preceding month: Deadline to cancel any code/voice number <br> <br>
        20th of the preceding month: Alerted about an upcoming deduction on 1st of the month for any active service <br> <br>
        1st of the month: Monthly maintenance fee deducted based on active service <br> <br>
        If a Deduction Fails (Due to Insufficient Funds) <br>
        If the deduction on the 1st causes your wallet balance to become zero or negative: <br><br>
        Immediate Service Suspension: All your services that rely on a positive wallet balance are suspended immediately. You will not be able to send messages, make calls, etc. <br><br>
        On the 20th of the month: If the wallet has not been funded, the specific short code, USSD code or phone number is formally disabled. <br><br>
        Code Deactivation at the End of the month: If there is still no payment, the code/voice number is deactivated. <br><br>
        ⚠️ Please Note: Phone numbers and USSD codes will be returned to the telco at the end of first month of non-payment while shortcodes are returned after three months of non-payment. <br><br><br>
        Services That Accrue a Monthly Maintenance Fee: <br>
        SMS Shortcodes <br>
        USSD Service Codes <br>
        Voice Phone Numbers <br>
        Sender IDs <br><br><br>
        Service Termination Process:<br>To Avoid Next Month's Billing: <br>
        Deadline: Cancel your code/voice number by 19th of current month <br>
        Method: Written notice to the product specific email: <br>
        USSD info@q4iltd.com <br>
        Shortcode info@q4iltd.com <br>
        Voice info@q4iltd.com <br>
        Confirmation: We'll confirm termination and final billing <br>
        Example: To avoid 1st October billing <br>
        Termination notice: By 19th August, 11:59 PM <br>
        Service ends: 31st August, 11:59 PM <br>
        1st September: No maintenance fee deducted and the code/voice number is deactivated`,
      isOpen: false,
    },
    {
      question: 'How long is the duration of a USSD session for Nigerian Telcos?',
      answer: `The duration of a USSD session in Nigeria is 120 seconds. <br><br>
        There is a character limit(number of characters that can be used in a menu before it gets truncated) for the USSD menus, which is 160.<br><br>
        The idle time(how long we wait for a user to respond before terminating) is 30seconds.`,
      isOpen: false,
    },
    {
      question: 'How do I get a USSD code in Nigeria?',
      answer: `The duration of a USSD session in Nigeria is 120 seconds. <br><br>
        In Nigeria,we offer dedicated codes and channels on our shared USSD code. This code is presently connected on MTN, Airtel, Glo and 9mobile.<br><br>
        Getting set up on our shared USSD varies, however there is a monthly maintenance fee of NGN 253,750 (Exclusive of 7.5% VAT). See our pricing page for pricing.<br><br>
        For KYC, we will require the following from you:<br><br>
        -Certificate of Incorporation.<br>
        -Letter of request<br>
        -Valid Form Of ID (Int’l Passport, Voter’s Card, Driver’s License, National ID).<br><br>
        Send them to info@q4iltd.com<br>
        It will take one working day to get it set up.<br><br>
        For dedicated codes, we raise them on all telcos <br><br>
        NCC charge to be paid through remita - #11,500<br><br>
        A POP of the NCC charge and the required documents will be submitted to the NCC, after which the NCC will send the invoice for your license fee and renewal fee.<br>
        For allocation fee/yearly renewal kindly check https://www.ncc.gov.ng/technical-regulation/standards/numbering#new-pricing-regime-for-national-numbering-short-codes<br><br>
        USSD code acquisition and integration fee to Q4  - #200,00<br>
        Monthly maintenance fee - 100,000+7.5% VAT<br>
        Connection fee to 9mobile for financial institutions - #770,000<br>
        Connection fee to MTN for all sectors - #500,000<br>
        Minimum session cost of 200,000 sessions for postpaid (owner of the code billing)<br>
        Minimum session cost of 350,000 sessions on Glo at the charge of #10 per session.<br>
`,
      isOpen: false,
    },
    {
      question: 'What are the different types of USSD codes?',
      answer: `(i) Shared USSD <br><br>
        This is one dedicated code that is mapped to Q4I and allows us to provide you with a channel on our dedicated code for example *384* 23# or *483*23#.<br><br>
        *384* is our dedicated code on postpaid mode.<br>
        *483* is our dedicated code on prepaid mode><br>
        23    is the channel .<br><br>
        (ii) Dedicated USSD<br><br>
        The code belongs to(is dedicated to :-)your organization and can be raised across all networks based on availability on the other networks.<br>
        Our codes range from 2XX, 4XX and 8XX<br><br>
        For example *244# or *845#<br><br>
`,
      isOpen: false,
    },
    {
      question: 'Airtime is disabled on my account, how do I enable it?',
      answer: `Airtime is currently disabled for all accounts for security reasons.<br><br>
        To enable airtime on your account, you need to :<br><br>
        Please write a letter addressed to us, under your company letterhead. Ensure the letter is stamped and signed by top management, see the sample letter here<br>
        Fill out a contact form (attached)<br>
        You will also need to sign a service agreement with us<br><br>
        Email the letter and the form to info@q4iltd.com and ensure you attach all the relevant documents<br><br>
`,
      isOpen: false,
    },
    {
      question: 'How do I activate mobile data on my account?',
      answer: `Mobile data is currently disabled for all accounts for security reasons. <br><br>
        To enable it on your account, you need to:<br><br>
        Write a letter addressed to us Q4ILTD, under your company letterhead. Ensure the letter is stamped and signed by top management; see the sample letter here<br><br>
        Fill out a contact form<br>
        You will also need to sign a service agreement with us<br><br>
        Once #1 and #2 are ready, please email them to us, indicating the full name of your company signatory, their position within the organization and email address. We will use these details to send them the service agreement.<br><br>
        Your mobile data will then be activated if we receive all these requirements from your end.<br><br>
        For any further information please send us an email on info@q4iltd.com or support@q4iltd.com
`,
      isOpen: false,
    },
  ];

  toggleFaq(faq: { isOpen: boolean }) {
    // Close all other FAQs
    this.faqs.forEach((f) => {
      if (f !== faq) {
        f.isOpen = false;
      }
    });
    // Toggle the clicked one
    faq.isOpen = !faq.isOpen;
  }
}
