import os
import sys
import json

# Assurer que local-ai est dans sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from coach.gemini_coach import (
    get_coach_status,
    check_topic,
    get_feedback,
    TopicCheckRequest,
    FeedbackRequest,
)

def main():
    # 1. /coach/status
    status = get_coach_status()
    print(json.dumps(status, indent=2, ensure_ascii=False))

    # 2. /coach/topic/check avec input "le sport"
    topic_req = TopicCheckRequest(
        input="le sport",
        profile="aime: sport ; évite: economie"
    )
    topic_res = check_topic(topic_req)
    print(json.dumps(topic_res, indent=2, ensure_ascii=False))

    # 3. /coach/feedback debate avec un petit transcript
    feedback_req = FeedbackRequest(
        game="debate",
        subject="Le sport doit-il être obligatoire à l'école ?",
        transcript="Le sport à l'école est indispensable pour la santé des enfants et pour leur apprendre le respect des règles et le sens du collectif.",
        metrics=None,
        attempt=1,
        wantModel=False
    )
    feedback_res = get_feedback(feedback_req)
    print(json.dumps(feedback_res, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
