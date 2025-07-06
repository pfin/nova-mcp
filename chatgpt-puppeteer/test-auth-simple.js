import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function testAuth() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set cookies before navigation
  await page.setCookie(
    {
      name: '__Secure-next-auth.session-token',
      value: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..s928gZPhORMTAFYN.F9mBg-BesD42stakVdzQyqUQcq0gYeATn04QCgUcyjn6NMsfwhT3H8_9QwuJYpNPidGYkyjMJUeQ0SZkjYZb_ul2oi1slJXbQJRcUNMSHfVLKObNaSNWB4sPt9wfLIhy0JyrPl3l0QOaWZCMgc_kr2faL3e_4diqMAEIybTFiY77WEgA1UkOwH3CY-15ScoHhIHxnQorHNCUL19uMfKPS6sL1qVXCRkf3qqopqnju9BlxPNr3NbNIfHuIMNIsbsT5AsBJiBhvJawQT6ryGxhq3_VdZfcNqHMIRHNJB3aSTjmlVpV3KLGgQUsIHEzMqfjbcEGWF6RskiCKiZyyw1a3VGDKShS7PEX2lReKXYALAkXGKyuQU606IlEZ4qTZvBoOSNVoqLE6111WpLHsuJxz8sZl8TBg46lb0LXknqUNnRKDRUtg-hiO9sFGkCWbRpb4n40LxLfF0f5RjKN8QYgQ0jOJg1TndJIqhDH_XHOYhJ7AY8T7ptP9fedRKAdQ2pTJQQ3qw4O9JPaAfpdEma1UTNqNErkHBAyAbGJet9UrEYsu7W8cUUavh5c5fpyqucDA81CdZHJI1i1ar6KkRB4KpzOKv5KwUZGB0zQWqgLDR9aOclGLXNJ47D2xBM5vlS1g8UAfnO-lhM1qfhn-Ub8q8ue5_Fwee7724Pqx8siEKqN6tzSZgREcbQNaYTgeuDtPLUgTAimmpTwi1xKXAZVsEoYGFgwQTdh35pzKYXQlgzUyt-nYqZA94XdE5dZfzJ31NTs2sb1Z4iMg6e3LYhmKsMRUrfTyno8xe7xNC-ykEN45f6Wy3MLfHqpw3Zq6kCAY_nXBZSdztD3-aOVYaZmgCjYRm4AlAnOLVRNIC2k8Tf2KzzdXvCsvnHWGGZ8bLQZ_CSzPp-r6V1uldmHfKUyy1swq2gPpOHZqtxjbapNl4FX1C41Hsn7AbQwbTWkdACmoTQP8GlW1t6uV5FwidSjEKIvjnFTixn-aVQMpjkZFHBDzNR9Wq-35WmguMBOd3QZzBHQfBTkioABfb5U_33P6LM2y0RwK5FRKbKtt59A_Vhttv8nmznALaySITylhCXdQc7XHLE60bjiBXKqiZtouvCBq5vii0dgTxPqUSGiISCjcRnRxwTe3Otb1FuC12oUYxCkIOhlHdvZzwLY3n5cPqVEfoLtlSBO8xeMHGwBGO9rBcbvgcopat55WKLwwliWGUGoxZwjRocRjwC0kmu80Aw7-r8-x6cIRUG73oq4R1jEhhJPlo6W4CuiE5m87ntnXSwqHveK3dMHt5RPaTAca6GixoRmDLEbuSYCEpAMwu54PRr_11ifPEOHJT7xrgheZau0igCQAI1aG2nMysZLoTbD290j43Bb8AjL5YyIgCRlbPeFjMU4xG-7vZ-thGdrgnka9cTgJ2yFtj90alEBmokTbj3tt13mvkLlFoz-QyI29sDWPyAEbWLzFHLxEINgjCKJYy7HPhjwp2j7cXmkRrgsL0FHEQoRNAyR4YP2DmEl8vaoSHkg-BZebE5c2V2d08YeKD1dIkUkWzYyvZh4BQl29cfnxbP5CnNb-099rH9F-NFru1vIIbgHh_5-m2ca22Oa0vSHP6mAgmXIAxwTG5nrEwlEAikNfXG_0y842U_UQoa6l65E1APSUzoX0n-_Ezzj05A-u8eNx6E9ZrwNEdvnTXA_XIf5s1SA5D-TvqVLgLvf735yJKoi35LsQITSVw50SstBFFfjS36bp8YhBUu3dXrtJI6ursfrUModlkoz3x4bzYXlmTEGOsKUvo4cs1mbIJOgyrNcFfcXQxAs7eQICNktqO8YLUvTSflqPa6m0qoiPjwZP5HAYtCdoSdoxbaQLPYcATTOp7yePKbBZ8p4wKTo8jnRxBrbZYP-SQP1_lPXYBL9mhWMvoRYI_jjdZDbF6TrkVfQBKuupUdOTXpGnSKFvPxsYI2X3wnjx6QMppXJQRn6osu44tldGwOWf9bSeFvoCOJK5OiONtq34oUJUrxd_fsmjJBloRqFlPlxtDD5qtJe3y-tLU-VtmU0KkRXQagwbxqMpYcIHaYU0uK4RVPzSx5eGA5hLb1UvXZWQnc3GhLznLscsZw1ZaAYrpNMpU1DSw-zdWJIig7ZwvwpRkafJ0CpOn3ILmqkdpVA_4RsgDL-J1fT6itQPcQ1bAzhs-jxjtE3QHOvcT55xJwKsN_kZobAvMnG19BebGGemazox0g8IKKiCzLUqH1tI9wBqmnCawBBiZjnxlF16gHjGKT6JpNU3c0musSLOBBiqNSo3M9dq3WkWEv4SlxnXowJcY3JPtnoTIhZWzXVI-S-tnL-bcTHKKBwQSyTUtnm1iizWyu9E0GVj97wVfBPikOVxsfjuGJaOaU84B-tLDm6pcJuOkJ666cUTEoiSuuOFnIfji9wR5fKX_1-6pWLzfVQf8Viu2vPGyd28x4DdQLK3EX1-Q1h16VQOj1bajmAUAFUtNnRenwGrj08DtPwObpCvAtLCgtKl0G-m6jdf2lsyTVhWy6CIQFQ1sbP6_nLWQjmJxrH_ZuhnnoRjTzGYpltU_i5DxWc_N9vT73ljgSXQo8Ic4z1DFl_5q5ffGvB824WQcIIf9qe7IPwOHgF26mATy4GwmFajFt2J9P0Sn6I7fRthxcQh9kwgug7zhYFmIVg_xZrfxPpHneHhXChwdJpjtxrp9ZWtLe3JwfC4_OfB-7ejkhYGLx6lrKxvA0ve8WJ-EvyUdI5rnH6cMilctgxIx4bKpWLKWFfgy9tiH5h80ZtkH9cTL7Rz_6Qqunu2_3ZOcQXVpvEwWrGy8WnZAsQdBcm6SKpudAzCJrK_40pdJ5lv-lWNGLznUMYmIVaFioO63WEgG9X0-JUmnheR59uAqPUYGaQEDWI4gU2QP9Z9Apk6_j3VJvvnoHwTl0uw7CZJyAnm6C63wd9uDdTCZakdILojlkLHf6677GdUZ7OE-2VPVuzD3Gty5WR-PBS09a3rpDc1jw94IHzku5feT9fKRRFSd9QGBdVg_w8v1Am5zWKPYHq5BQLuC1waKuDD5QDgSuhRnOpb6wfzBuRfT0x-2bu83AlIfmCW93iHQ8goulIPkiajwalxjRR-qIU1Q2iaM2EC5AGspG4YX03zUoNMbiFqiFx_0uu660dLKZD1w6ohUJSnqw866tfnc9vCNVg-lnUsgJdlpFB0sQiEKfYGBAoqcytvpRxFgUWw4uF0YOutfELibAABvlQ0NBUxmOxEMUPqnk5-t8-xo3sOJeoB9OyhFVAlFQbdZEjtEdwf-1AgKTuYQXMYFHWwPDoYYchKyR74l2h8cbDPYzKu5LcxeFH-bdirGIarYrJ7PZxrPkYTKu_D9uu1z62ZHvNWep1tTECS-oDwABHDkSBn1ZN6J1w4aduE0dWU71Se1ivOlTgB2JenABxFMCTDp_w_0iTRliGKSoYcDV93r21Bz2kqRMdEksUWQTrbip3jE3aSskMY37LgcQh172Pi3-8-xoI3GAgCt1nNwI3xm-WZRPnbOv_trWkBFI0ia05vrNZ8VFQ_1rqLD4I2_Lk1A.XBp1IhKk1l-ffYLM5s3Daw',
      domain: '.chatgpt.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    },
    {
      name: 'cf_clearance',
      value: 'Xjs8sfNisD3xMaO7Q7AwsfohLz4IgJWYwaPYlCePJDw-1751375391-1.2.1.1-_61C3aizkJwxqgCFenMXmpUbwbAEforDhkgwrEjygsyuKb0kfYZHqrk88dimbG3XECscsi9OgAVBatmpvvE.1W5PHm0uXoRUelMT4gHqYgTvakzArJq.8GPzBFcVufNTkGJU1tvGCIJqoeK_To1j0sFazY5z21kVgTqX2z4RK44L_6u9OPFSvRRUfLhS8Y4.YUVvjjYeGSD2g.UYoM1P1Gl0xKaavdSp.A14ZkoS04hoxpuPTeMUe_Y4ZUrNcmT7_hyjTYgk6vCsKv6ByHup1H98Fdwjf5Hk8k8i5vEsnbfGKbpIEajMSWOOcMgETHRMW9b0BWXLYY_ny3YmRRv_IVHTTDUjjSKVYrsoVDcUH3s',
      domain: '.chatgpt.com',
      path: '/',
      httpOnly: true,
      secure: true
    }
  );
  
  console.log('Navigating to ChatGPT...');
  await page.goto('https://chatgpt.com', { waitUntil: 'networkidle2' });
  
  console.log('Waiting for page load...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check if logged in
  const isLoggedIn = await page.evaluate(() => {
    const chatInput = document.querySelector('textarea[placeholder*="Message"], textarea#prompt-textarea');
    const loginButton = document.querySelector('button[data-testid*="login"], a[href*="/auth/login"]');
    console.log('Chat input:', !!chatInput);
    console.log('Login button:', !!loginButton);
    return !!chatInput && !loginButton;
  });
  
  console.log('Is logged in:', isLoggedIn);
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'chatgpt-auth-test.png' });
  console.log('Screenshot saved to chatgpt-auth-test.png');
  
  await browser.close();
}

testAuth().catch(console.error);