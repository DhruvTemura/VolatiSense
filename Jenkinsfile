pipeline {
    agent any

    environment {
        BACKEND_DIR = 'backend'
        FRONTEND_DIR = 'frontend'
    }

    stages {
        stage('Clone Repo') {
            steps {
                echo 'Cloning repository...'
                // Jenkins clones automatically from the Git config
            }
        }

        stage('Setup Python Env & Train Model') {
            steps {
                dir("${env.BACKEND_DIR}") {
                    // Use try-catch for Windows/Linux support
                    script {
                        if (isUnix()) {
                            sh '''
                            python3 -m venv venv
                            . venv/bin/activate
                            pip install -r requirements.txt || true
                            python model/train_update.py
                            '''
                        } else {
                            bat '''
                            python -m venv venv
                            call venv\\Scripts\\activate
                            pip install -r requirements.txt || exit /b 0
                            python model\\train_update.py
                            '''
                        }
                    }
                }
            }
        }

        stage('Build React Frontend') {
            steps {
                dir("${env.FRONTEND_DIR}") {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                archiveArtifacts artifacts: '**/model/*.pkl, **/frontend/build/**', fingerprint: true
            }
        }
    }

    post {
        success {
            echo '✅ Jenkins pipeline completed successfully!'
        }
        failure {
            echo '❌ Jenkins pipeline failed.'
        }
    }
}
