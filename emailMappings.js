// emailMappings.js

const emailMappings = {
    engineering: {
        departments: {
            "department_of_civil_engineering": {
                head: "civil.head@university.edu",
                dean: "engineering.dean@university.edu"
            },
            "department_of_computer_engineering": {
                head: "computer.head@university.edu",
                dean: "engineering.dean@university.edu"
            },
            // Add other departments similarly
        }
    },
    agriculture: {
        departments: {
            "department_of_agricultural_biology": {
                head: "agbiology.head@university.edu",
                dean: "agriculture.dean@university.edu"
            },
            // Add other departments similarly
        }
    },
    // Add other faculties similarly
};

module.exports = emailMappings;
