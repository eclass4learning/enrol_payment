define(['jquery'], function($) {

    var EnrolPage = {

        MultipleRegistration: {

            //This just counts up to make sure no two email inputs will ever
            //have the same ID.
            nextEmailID: 1,

            getEmails: function() {
                var emails = [];

                $(".mr-email-line input").each(function() {
                    var email = $(this).val();
                    if($.trim(email) !== "") {
                        emails.push(email);
                    }
                });
                alert(emails.toString());
            },

            addPlusClickHandler: function(plus,wwwroot) {
                var self = this;

                plus.click(function() {
                    var nextHtml = self.makeEmailEntryLine(wwwroot);
                    $(".plus-container").remove();
                    $("#multiple-registration-container").append(nextHtml);
                    self.addPlusClickHandler($('.plus-container'), wwwroot);
                    self.addMinusClickHandler($('.minus-container'), wwwroot);
                });
            },

            addMinusClickHandler: function(minus,wwwroot) {
                var self = this;
                minus.click(function() {
                    $(this).parent().remove();
                    $(".plus-container").remove();
                    $(".mr-email-line:last").append(self.makePlusSign(wwwroot));
                    self.refreshEmailNums();
                    self.addPlusClickHandler($('.plus-container'), wwwroot);
                    self.addMinusClickHandler($('.minus-container'), wwwroot);
                });
            },

            makePlusSign: function(wwwroot) {
                var plusSign = "<div class=\"plus-container\"><img src=\""
                             + wwwroot + "/enrol/ecommerce/pix/plus.svg\" class=\"plus\"></div>";
                return plusSign;
            },

            makePlusAndMinusSigns: function(n, wwwroot) {
                var plusSign = this.makePlusSign(wwwroot);
                var minusSign = "<div class=\"minus-container\"><img src=\""
                             + wwwroot + "/enrol/ecommerce/pix/minus.svg\" class=\"minus\"></div>";
                if (n > 1) {
                    return plusSign + minusSign;
                } else {
                    return plusSign;
                }
            },

            //Re-number the email labels; return the next email number to use.
            refreshEmailNums: function() {
                var lastIndex = -1;
                $('.email-num').each(function(index) {
                    $(this).text(index + 1);
                    lastIndex = index;
                });
                return lastIndex + 2;
            },

            makeEmailEntryLine: function(wwwroot) {
                var self = this;
                var m = self.refreshEmailNums();
                var n = self.nextEmailID;
                self.nextEmailID = self.nextEmailID + 1;

                var inputID = "\"multiple-registration-email-" + n + "\"";
                var div = "<div class=\"mr-email-line\">";
                var label = "<div class=\"mr-email-label-container\"><label for=" + inputID + ">"
                          + "Email <span class=\"email-num\">" + m + "</span>:&nbsp;&nbsp;&nbsp;</label></div>";
                var emailEntryLine = "<input id=" + inputID + " type=\"text\" class=\"multiple-registration-email\" />";
                var endDiv = "</div>";

                return div + label + emailEntryLine + this.makePlusAndMinusSigns(n,wwwroot) + endDiv;
            },

            //Handle a click on the Multiple Registration button
            multipleRegistration: function(instanceid, wwwroot, btn) {
                var self = this;


                if(btn.hasClass('enable-mr')) {
                    //Build DOM for a multiple-registration form

                    btn.text("Cancel multiple registration");
                    btn.removeClass('enable-mr').addClass('disable-mr');
                    $("#enrol-ecommerce-submit").val("Verify emails and send payment");
                    $("#multiple-registration-container").html(this.makeEmailEntryLine(wwwroot));
                    self.addPlusClickHandler($(".plus-container"), wwwroot);

                } else if (btn.hasClass('disable-mr')) {
                    //Return to single registration mode

                    btn.text("Multiple Registration");
                    btn.removeClass('disable-mr').addClass('enable-mr');
                    $("#enrol-ecommerce-submit").val("Send payment via PayPal");
                    $(".mr-email-line").remove();
                }
            },
        },

        Discount: {
            checkDiscountCode: function(instanceid, wwwroot) {
                var discountcode = $("#discountcode").val();
                var checkURL = wwwroot + "/enrol/ecommerce/check_discount.php";

                $.ajax({
                    url: checkURL,
                    data: { 'discountcode': discountcode
                          , 'instanceid': instanceid
                          },
                    context: document.body,
                    success: function(r) {
                        var response = JSON.parse(r);
                        if (response["success"]) {
                            var discounted_cost = response["discounted_cost"];
                            $("span#localisedcost").text(discounted_cost);
                            $("input[name=amount]").val(discounted_cost);
                        } else {
                            alert("Invalid discount code.");
                        }
                    }
                });
            },
        },

        init: function(instanceid,wwwroot) {
            var self = this;
            $("#apply-discount").click(function() { self.Discount.handleDiscountCode(instanceid, wwwroot); });
            $("#multiple-registration-btn").click(function() {
                self.MultipleRegistration.multipleRegistration(instanceid, wwwroot, $(this));
            });
            $("#enrol-ecommerce-submit").click(function(e) {
                e.preventDefault();
                self.MultipleRegistration.getEmails();
            });
        }
    };

    return EnrolPage;

});
