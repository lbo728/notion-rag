import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

/**
 * Notion Webhook 설정 가이드 스크립트
 *
 * 참고: Notion MCP나 API로는 Webhook을 자동 생성할 수 없습니다.
 * Notion Integration 설정 페이지에서 수동으로 설정해야 합니다.
 *
 * 이 스크립트는 필요한 정보를 출력해줍니다.
 */
async function printWebhookSetupGuide() {
  const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL;

  console.log("\n🔗 Notion Webhook 설정 가이드\n");
  console.log("=".repeat(60));

  // Webhook URL 구성
  let webhookUrl = "";
  if (vercelUrl) {
    webhookUrl = `${vercelUrl}/api/webhooks/notion`;
    // HTTPS 확인
    if (!webhookUrl.startsWith("https://")) {
      webhookUrl = webhookUrl.replace("http://", "https://");
    }
  } else {
    console.log(
      "⚠️  VERCEL_URL 또는 NEXT_PUBLIC_APP_URL이 설정되지 않았습니다."
    );
    console.log("   Preview 배포 후 URL을 확인하세요.\n");
    webhookUrl = "https://your-preview-url.vercel.app/api/webhooks/notion";
  }

  console.log("\n📋 필요한 정보:\n");
  console.log("1. Webhook URL:");
  console.log(`   ${webhookUrl}\n`);

  console.log("2. 설정 단계:\n");
  console.log("   a) Notion Integration 설정 페이지 접속:");
  console.log("      https://www.notion.so/my-integrations\n");
  console.log("   b) 사용 중인 Integration 선택\n");
  console.log("   c) '웹훅' 또는 'Webhooks' 탭 클릭\n");
  console.log("   d) '구독 생성하기' 또는 'Create Subscription' 클릭\n");
  console.log("   e) 다음 정보 입력:");
  console.log(`      - URL: ${webhookUrl}`);
  console.log("      - API 버전: 2025-09-03 (또는 최신)");
  console.log("      - 이벤트:");
  console.log("        ✅ 페이지 > page.created");
  console.log("        ✅ 페이지 > page.updated");
  console.log("        ✅ 페이지 > page.deleted");
  console.log("        (필요 시 데이터베이스 이벤트도 선택)\n");
  console.log("   f) Webhook Secret 복사 후 .env.local에 추가:");
  console.log("      NOTION_WEBHOOK_SECRET=복사한_시크릿\n");

  console.log("3. 환경 변수 설정:\n");
  console.log("   Preview 환경:");
  console.log(
    "   - Vercel Dashboard → Project Settings → Environment Variables"
  );
  console.log("   - NOTION_WEBHOOK_SECRET 추가 (Preview 환경 선택)\n");

  console.log("=".repeat(60));
  console.log("\n💡 참고:");
  console.log(
    "   - Webhook은 HTTPS URL이 필요합니다 (로컬 테스트는 ngrok 사용)"
  );
  console.log("   - Preview 환경의 URL을 먼저 배포한 후 설정하세요");
  console.log(
    "   - Webhook 설정 후 Notion에서 새 페이지를 만들어 테스트하세요\n"
  );
}

printWebhookSetupGuide().catch(console.error);


