#!/bin/bash
cd /home/kavia/workspace/code-generation/hireiq-recruiter--candidate-portal-116418-5331d330/hireiq_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

