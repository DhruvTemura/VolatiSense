pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.yml'
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Checking out latest code from main branch...'
                git branch: 'main', url: 'https://github.com/DhruvTemura/VolatiSense.git'
            }
        }

        stage('Build Docker Images') {
            steps {
                echo 'Building Docker images...'
                sh '''
                    docker-compose down --remove-orphans
                    docker-compose pull || true
                    docker-compose build --no-cache
                '''
            }
        }

        stage('Run Docker Containers') {
            steps {
                echo 'Starting Docker containers...'
                sh 'docker-compose up -d'
            }
        }

        stage('Show Running Containers') {
            steps {
                echo 'Currently running containers:'
                sh 'docker ps'
            }
        }

        stage('Show Docker Logs') {
            steps {
                echo 'Fetching Docker logs...'
                sh 'docker-compose logs --tail=100'
            }
        }
    }

    post {
        failure {
            echo 'Pipeline failed. Cleaning up Docker containers...'
            sh 'docker-compose down'
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        always {
            echo 'Cleaning up dangling images (optional)...'
            sh 'docker image prune -f || true'
        }
    }
}
